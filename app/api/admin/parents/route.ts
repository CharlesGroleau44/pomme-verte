// app/api/admin/parents/route.ts
// Profils des comptes parents — la bascule "Prépayé à l'année" se fait via
// PATCH /api/admin/parents/[id], l'ouverture d'un compte directement par
// Christine via POST ci-dessous. Sous /api/admin, donc couvert par l'auth
// admin standard du middleware (contrairement à /api/parent/*, qui est
// l'espace public parent).
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { hacherMotDePasse } from '@/lib/parent-auth';
import { genererJetonReinitialisation } from '@/lib/parent-auth';
import { soldePrepaye } from '@/lib/solde-prepaye';
import { soldeEntente, etatVersement } from '@/lib/entente';
import { NIVEAUX_VALIDES, INTOLERANCES_VALIDES } from '@/lib/commandes';
import { envoyerBienvenueCompteAdmin } from '@/lib/courriels-envois';

export const dynamic = 'force-dynamic';

export async function GET() {
  const parents = await prisma.compteParent.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      enfants: { orderBy: { createdAt: 'asc' } },
      _count: { select: { enfants: true, commandes: true } },
    },
  });
  // Le solde (compte) et l'entente (par enfant, voir lib/entente.ts) ne se
  // calculent que là où c'est actif — évite de sommer des lignes de
  // commande pour tout le monde à chaque chargement de la liste.
  const avecSolde = await Promise.all(
    parents.map(async (p) => ({
      ...p,
      solde: p.soldePrepayeActif ? await soldePrepaye(p.id) : null,
      enfants: await Promise.all(
        p.enfants.map(async (e) => ({
          ...e,
          entente: e.prepayeAnnuel
            ? {
                ...(await soldeEntente(e.id)),
                versements: e.ententeVersements,
                versement2: etatVersement(e.ententeDate2eVersement, e.ententeVerse2Paye),
              }
            : null,
        }))
      ),
    }))
  );
  return NextResponse.json(avecSolde);
}

const FORMULES_COMPTE = ['AUCUN', 'ENTENTE', 'SOLDE'] as const;

// Ouverture directe d'un compte parent par Christine — demandé le 17 août
// 2026 pour les parents qui la paient en personne (comptant, chèque) et ne
// créent jamais leur propre compte. Mot de passe aléatoire et inutilisable :
// le parent y accède UNIQUEMENT via le lien envoyé par courriel, jamais en
// le devinant.
export async function POST(req: NextRequest) {
  const body = await req.json();

  const nom = typeof body.nom === 'string' ? body.nom.trim() : '';
  const courriel = typeof body.courriel === 'string' ? body.courriel.trim().toLowerCase() : '';
  const telephone = typeof body.telephone === 'string' && body.telephone.trim() ? body.telephone.trim() : null;

  const prenom = typeof body.enfantPrenom === 'string' ? body.enfantPrenom.trim() : '';
  const nomDeFamille = typeof body.enfantNomDeFamille === 'string' ? body.enfantNomDeFamille.trim() : '';
  const niveau = typeof body.enfantNiveau === 'string' ? body.enfantNiveau : '';
  const institutionId = typeof body.enfantInstitutionId === 'string' ? body.enfantInstitutionId : '';
  const intolerances = Array.isArray(body.enfantIntolerances)
    ? body.enfantIntolerances.filter((i: unknown) => typeof i === 'string' && INTOLERANCES_VALIDES.includes(i))
    : [];
  const autreIntolerance = typeof body.enfantAutreIntolerance === 'string' && body.enfantAutreIntolerance.trim()
    ? body.enfantAutreIntolerance.trim() : null;

  const formule = typeof body.formule === 'string' ? body.formule : 'AUCUN';
  const depotInitial = Number(body.depotInitial);

  if (!nom) return NextResponse.json({ error: 'Le nom du parent est requis.' }, { status: 400 });
  if (!courriel || !courriel.includes('@')) return NextResponse.json({ error: 'Courriel invalide.' }, { status: 400 });
  if (!prenom || !nomDeFamille) return NextResponse.json({ error: 'Le prénom et le nom de famille de l\'enfant sont requis.' }, { status: 400 });
  if (!NIVEAUX_VALIDES.includes(niveau)) return NextResponse.json({ error: 'Niveau invalide.' }, { status: 400 });
  if (!institutionId) return NextResponse.json({ error: 'L\'institution de l\'enfant est requise.' }, { status: 400 });
  if (!(FORMULES_COMPTE as readonly string[]).includes(formule)) {
    return NextResponse.json({ error: 'Formule invalide.' }, { status: 400 });
  }

  const existant = await prisma.compteParent.findUnique({ where: { courriel } });
  if (existant) {
    return NextResponse.json({ error: 'Un compte existe déjà avec ce courriel.' }, { status: 409 });
  }

  const motDePasseHash = await hacherMotDePasse(randomBytes(32).toString('hex'));
  const resetToken = genererJetonReinitialisation();
  const resetTokenExpire = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 jours

  const parent = await prisma.$transaction(async (tx) => {
    const p = await tx.compteParent.create({
      data: {
        courriel, motDePasseHash, nom, telephone,
        resetToken, resetTokenExpire,
        soldePrepayeActif: formule === 'SOLDE',
      },
    });
    // L'entente annuelle est PAR ENFANT (voir lib/entente.ts) — activée
    // directement sur cet enfant plutôt que sur le compte.
    await tx.enfant.create({
      data: {
        compteParentId: p.id, prenom, nomDeFamille, niveau, institutionId, intolerances, autreIntolerance,
        prepayeAnnuel: formule === 'ENTENTE',
        ententeVersements: formule === 'ENTENTE' ? 1 : null,
      },
    });
    if (formule === 'SOLDE' && Number.isFinite(depotInitial) && depotInitial > 0) {
      await tx.depotPrepaye.create({
        data: { compteParentId: p.id, montant: depotInitial.toFixed(2), motif: 'Dépôt initial — compte ouvert par Christine' },
      });
    }
    return p;
  });

  const origine = process.env.SITE_URL ?? new URL(req.url).origin;
  const lien = `${origine}/parent/reinitialiser?jeton=${resetToken}`;
  const formuleActivee = formule === 'ENTENTE' ? 'Entente annuelle' : formule === 'SOLDE' ? 'Solde prépayé' : null;
  void envoyerBienvenueCompteAdmin({ a: parent.courriel, nom: parent.nom, lien, formuleActivee });

  return NextResponse.json({ id: parent.id, courriel: parent.courriel, nom: parent.nom }, { status: 201 });
}
