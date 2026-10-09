// app/api/parent/inscription/route.ts
// Crée le compte ET le premier enfant en une seule transaction — évite le
// détour "créez d'abord votre compte, puis ajoutez un enfant" qui cassait
// la promesse "commande en quelques secondes" faite sur la page de choix
// (voir FormulaireCommande.tsx).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hacherMotDePasse } from '@/lib/parent-auth';
import { creerJetonParent, secretSession } from '@/lib/parent-session';
import { NIVEAUX_VALIDES, INTOLERANCES_VALIDES } from '@/lib/commandes';
import { envoyerBienvenueParent, envoyerCourrielsDemandePrepaye } from '@/lib/courriels-envois';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const courriel = typeof body.courriel === 'string' ? body.courriel.trim().toLowerCase() : '';
  const motDePasse = typeof body.motDePasse === 'string' ? body.motDePasse : '';
  const nom = typeof body.nom === 'string' ? body.nom.trim() : '';
  const telephone = typeof body.telephone === 'string' ? body.telephone.trim() : null;

  const prenom = typeof body.enfantPrenom === 'string' ? body.enfantPrenom.trim() : '';
  const nomDeFamille = typeof body.enfantNomDeFamille === 'string' ? body.enfantNomDeFamille.trim() : '';
  const niveau = typeof body.enfantNiveau === 'string' ? body.enfantNiveau : '';
  const institutionId = typeof body.enfantInstitutionId === 'string' ? body.enfantInstitutionId : '';
  const intolerances = Array.isArray(body.enfantIntolerances)
    ? body.enfantIntolerances.filter((i: unknown) => typeof i === 'string' && INTOLERANCES_VALIDES.includes(i))
    : [];
  const autreIntolerance = typeof body.enfantAutreIntolerance === 'string' && body.enfantAutreIntolerance.trim()
    ? body.enfantAutreIntolerance.trim() : null;

  // Formule de paiement demandée à l'inscription — fusion demande+compte
  // (Christine, courriel du 14 août 2026 : « soustraire la demande...et
  // les diriger directement à l'ouverture de compte »). N'active rien :
  // ça crée seulement la DemandePrepaye que Christine traite comme avant,
  // depuis /admin/demandes puis /admin/parents — mais sans le
  // courriel « voici la marche à suivre », puisque le compte existe déjà.
  const formule = typeof body.formule === 'string' ? body.formule : '';

  if (!courriel || !courriel.includes('@')) {
    return NextResponse.json({ error: 'Courriel invalide.' }, { status: 400 });
  }
  if (motDePasse.length < 8) {
    return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' }, { status: 400 });
  }
  if (!nom) {
    return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 });
  }
  if (!prenom || !nomDeFamille) {
    return NextResponse.json({ error: 'Le prénom et le nom de famille de votre enfant sont requis.' }, { status: 400 });
  }
  if (!NIVEAUX_VALIDES.includes(niveau)) {
    return NextResponse.json({ error: 'Niveau invalide.' }, { status: 400 });
  }
  if (!institutionId) {
    return NextResponse.json({ error: 'L\'institution de votre enfant est requise.' }, { status: 400 });
  }

  const existant = await prisma.compteParent.findUnique({ where: { courriel } });
  if (existant) {
    return NextResponse.json({
      error: 'Un compte existe déjà avec ce courriel. Utilisez « Mot de passe oublié » pour y accéder.',
    }, { status: 409 });
  }

  const motDePasseHash = await hacherMotDePasse(motDePasse);
  const parent = await prisma.$transaction(async (tx) => {
    const p = await tx.compteParent.create({ data: { courriel, motDePasseHash, nom, telephone } });
    await tx.enfant.create({
      data: { compteParentId: p.id, prenom, nomDeFamille, niveau, institutionId, intolerances, autreIntolerance },
    });
    return p;
  });

  void envoyerBienvenueParent({ a: parent.courriel, nom: parent.nom });

  if (formule === 'ENTENTE' || formule === 'SOLDE') {
    const demande = await prisma.demandePrepaye.create({
      data: {
        institutionId,
        formule,
        nomParent: nom,
        courriel,
        telephone,
        nomEnfant: `${prenom} ${nomDeFamille}`,
        compteParentId: parent.id,
      },
    });
    void envoyerCourrielsDemandePrepaye(demande.id);
  }

  const jeton = await creerJetonParent(parent.id, secretSession());

  const res = NextResponse.json({ id: parent.id, courriel: parent.courriel, nom: parent.nom }, { status: 201 });
  res.cookies.set('pv_parent', jeton, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 90, // 90 jours — un parent ne devrait pas avoir à se reconnecter à chaque cycle de menu
  });
  return res;
}
