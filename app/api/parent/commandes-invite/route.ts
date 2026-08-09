// app/api/parent/commandes-invite/route.ts
// Commande sans compte : la personne entre les coordonnées de l'élève
// et du parent directement dans le formulaire, en même temps que son
// choix de repas. Aucune connexion requise. Pour ne pas dupliquer un
// CompteParent/Enfant à chaque commande du même invité, on retrouve
// (par courriel, puis par nom+école) l'enregistrement existant s'il y
// en a un et on le met à jour plutôt que d'en créer un nouveau — mais
// ce compte reste un compte "invité" : mot de passe aléatoire et
// inutilisable, aucune connexion possible avec (voir /parent/connexion).
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { hacherMotDePasse } from '@/lib/parent-auth';
import {
  ErreurCommande, MODES_PAIEMENT_VALIDES, NIVEAUX_VALIDES, INTOLERANCES_VALIDES,
  chargerEtValiderMenu, enregistrerCommande, validerLignes,
} from '@/lib/commandes';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const parentNom = typeof body.parentNom === 'string' ? body.parentNom.trim() : '';
  const parentTelephone = typeof body.parentTelephone === 'string' ? body.parentTelephone.trim() : '';
  const parentCourriel = typeof body.parentCourriel === 'string' ? body.parentCourriel.trim().toLowerCase() : '';
  const nomDeFamille = typeof body.nomDeFamille === 'string' ? body.nomDeFamille.trim() : '';
  const prenom = typeof body.prenom === 'string' ? body.prenom.trim() : '';
  const niveau = typeof body.niveau === 'string' ? body.niveau : '';
  const intolerances = Array.isArray(body.intolerances)
    ? body.intolerances.filter((i: unknown) => typeof i === 'string' && INTOLERANCES_VALIDES.includes(i))
    : [];
  const autreIntolerance = typeof body.autreIntolerance === 'string' && body.autreIntolerance.trim() ? body.autreIntolerance.trim() : null;
  const menuId = typeof body.menuId === 'string' ? body.menuId : '';
  const modePaiement = typeof body.modePaiement === 'string' ? body.modePaiement : '';

  if (!parentNom || !parentTelephone || !parentCourriel || !parentCourriel.includes('@')) {
    return NextResponse.json({ error: 'Nom, téléphone et courriel du parent sont requis.' }, { status: 400 });
  }
  if (!nomDeFamille || !prenom) {
    return NextResponse.json({ error: 'Nom de famille et prénom de l\'élève sont requis.' }, { status: 400 });
  }
  if (!NIVEAUX_VALIDES.includes(niveau)) {
    return NextResponse.json({ error: 'Niveau invalide.' }, { status: 400 });
  }
  if (!MODES_PAIEMENT_VALIDES.includes(modePaiement)) {
    return NextResponse.json({ error: 'Mode de paiement invalide.' }, { status: 400 });
  }

  try {
    const lignes = validerLignes(body.lignes);

    const menu = await prisma.menu.findUnique({ where: { id: menuId } });
    if (!menu) return NextResponse.json({ error: 'Menu introuvable.' }, { status: 404 });

    const compteParent = await prisma.compteParent.upsert({
      where: { courriel: parentCourriel },
      update: { nom: parentNom, telephone: parentTelephone },
      create: {
        courriel: parentCourriel,
        nom: parentNom,
        telephone: parentTelephone,
        // Compte "invité" : mot de passe aléatoire, jamais communiqué —
        // cette personne ne pourra pas se connecter avec, seulement
        // repasser une commande invité avec le même courriel.
        motDePasseHash: await hacherMotDePasse(randomBytes(32).toString('hex')),
      },
    });

    const enfantExistant = await prisma.enfant.findFirst({
      where: { compteParentId: compteParent.id, nomDeFamille, prenom, institutionId: menu.institutionId },
    });
    const enfant = enfantExistant
      ? await prisma.enfant.update({ where: { id: enfantExistant.id }, data: { niveau, intolerances, autreIntolerance } })
      : await prisma.enfant.create({
          data: { compteParentId: compteParent.id, nomDeFamille, prenom, niveau, institutionId: menu.institutionId, intolerances, autreIntolerance },
        });

    await chargerEtValiderMenu(menuId, enfant.institutionId, lignes, modePaiement);
    const commande = await enregistrerCommande({ compteParentId: compteParent.id, enfantId: enfant.id, menuId, modePaiement, lignes });
    return NextResponse.json(commande, { status: 201 });
  } catch (e) {
    if (e instanceof ErreurCommande) return NextResponse.json({ error: e.message }, { status: e.statut });
    throw e;
  }
}
