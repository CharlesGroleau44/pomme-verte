// app/api/parent/moi/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { idParentDepuisCookie } from '@/lib/parent-session';
import { hacherMotDePasse, verifierMotDePasse } from '@/lib/parent-auth';
import { MODES_PAIEMENT_VALIDES } from '@/lib/commandes';
import { soldeEntente, etatVersement } from '@/lib/entente';
import { soldePrepaye } from '@/lib/solde-prepaye';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const compteParentId = await idParentDepuisCookie(req.cookies.get('pv_parent')?.value);
  if (!compteParentId) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const parent = await prisma.compteParent.findUnique({
    where: { id: compteParentId },
    include: { enfants: { include: { institution: true }, orderBy: { createdAt: 'asc' } } },
  });
  if (!parent) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  // Entente annuelle : par enfant depuis le 17 août 2026 (voir
  // lib/entente.ts) — chaque enfant porte son propre forfait/solde, le
  // parent reste sur un seul compte.
  const enfants = await Promise.all(
    parent.enfants.map(async (e) => ({
      ...e,
      entente: e.prepayeAnnuel
        ? {
            ...(await soldeEntente(e.id)),
            versements: e.ententeVersements,
            versement2: etatVersement(e.ententeDate2eVersement, e.ententeVerse2Paye),
          }
        : null,
    }))
  );

  return NextResponse.json({
    id: parent.id,
    courriel: parent.courriel,
    nom: parent.nom,
    telephone: parent.telephone,
    soldePrepayeActif: parent.soldePrepayeActif,
    modePaiementPrefere: parent.modePaiementPrefere,
    enfants,
    soldePrepaye: parent.soldePrepayeActif ? await soldePrepaye(parent.id) : null,
  });
}

// Édite le profil (nom/téléphone/courriel/mode de paiement préféré) et,
// optionnellement, le mot de passe — un seul PATCH pour les deux, le
// changement de mot de passe n'a lieu que si motDePasseNouveau est fourni
// (et exige alors motDePasseActuel, revérifié ici — jamais fait confiance
// au front).
export async function PATCH(req: NextRequest) {
  const compteParentId = await idParentDepuisCookie(req.cookies.get('pv_parent')?.value);
  if (!compteParentId) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const parentActuel = await prisma.compteParent.findUnique({ where: { id: compteParentId } });
  if (!parentActuel) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ('nom' in body) {
    const nom = typeof body.nom === 'string' ? body.nom.trim() : '';
    if (!nom) return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 });
    data.nom = nom;
  }
  if ('telephone' in body) {
    data.telephone = typeof body.telephone === 'string' && body.telephone.trim() ? body.telephone.trim() : null;
  }
  if ('courriel' in body) {
    const courriel = typeof body.courriel === 'string' ? body.courriel.trim().toLowerCase() : '';
    if (!courriel || !courriel.includes('@')) {
      return NextResponse.json({ error: 'Courriel invalide.' }, { status: 400 });
    }
    if (courriel !== parentActuel.courriel) {
      const existant = await prisma.compteParent.findUnique({ where: { courriel } });
      if (existant) return NextResponse.json({ error: 'Un compte existe déjà avec ce courriel.' }, { status: 409 });
    }
    data.courriel = courriel;
  }
  if ('modePaiementPrefere' in body) {
    const v = body.modePaiementPrefere;
    if (v !== null && !MODES_PAIEMENT_VALIDES.includes(v)) {
      return NextResponse.json({ error: 'Mode de paiement invalide.' }, { status: 400 });
    }
    data.modePaiementPrefere = v;
  }

  if (body.motDePasseNouveau) {
    const motDePasseNouveau = typeof body.motDePasseNouveau === 'string' ? body.motDePasseNouveau : '';
    const motDePasseActuel = typeof body.motDePasseActuel === 'string' ? body.motDePasseActuel : '';
    if (motDePasseNouveau.length < 8) {
      return NextResponse.json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' }, { status: 400 });
    }
    const valide = await verifierMotDePasse(motDePasseActuel, parentActuel.motDePasseHash);
    if (!valide) {
      return NextResponse.json({ error: 'Mot de passe actuel incorrect.' }, { status: 400 });
    }
    data.motDePasseHash = await hacherMotDePasse(motDePasseNouveau);
  }

  const parent = await prisma.compteParent.update({ where: { id: compteParentId }, data });

  return NextResponse.json({
    id: parent.id,
    courriel: parent.courriel,
    nom: parent.nom,
    telephone: parent.telephone,
    modePaiementPrefere: parent.modePaiementPrefere,
  });
}
