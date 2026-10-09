// app/api/parent/moi/demande-prepaye/route.ts
// Demande en un clic pour un parent DÉJÀ connecté — voir
// app/api/parent/demande-prepaye/route.ts pour le formulaire complet
// destiné à un visiteur sans compte. Ici, tout est déjà connu (nom,
// courriel, téléphone, enfant) : pas de formulaire à remplir, juste à
// confirmer. Fusion demande+compte demandée par Christine (courriel du
// 14 août 2026).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { idParentDepuisCookie } from '@/lib/parent-session';
import { envoyerCourrielsDemandePrepaye } from '@/lib/courriels-envois';

export const dynamic = 'force-dynamic';

const FORMULES = ['ENTENTE', 'SOLDE'] as const;

export async function POST(req: NextRequest) {
  const compteParentId = await idParentDepuisCookie(req.cookies.get('pv_parent')?.value);
  if (!compteParentId) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const body = await req.json();
  const institutionId = typeof body.institutionId === 'string' ? body.institutionId : '';
  const formule = typeof body.formule === 'string' ? body.formule : '';
  if (!(FORMULES as readonly string[]).includes(formule)) {
    return NextResponse.json({ error: 'Formule invalide.' }, { status: 400 });
  }

  const parent = await prisma.compteParent.findUnique({
    where: { id: compteParentId },
    include: { enfants: { where: institutionId ? { institutionId } : undefined, orderBy: { createdAt: 'asc' } } },
  });
  if (!parent) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
  if (!institution) return NextResponse.json({ error: 'Institution introuvable.' }, { status: 404 });

  const demande = await prisma.demandePrepaye.create({
    data: {
      institutionId,
      formule: formule as 'ENTENTE' | 'SOLDE',
      nomParent: parent.nom,
      courriel: parent.courriel,
      telephone: parent.telephone,
      nomEnfant: parent.enfants[0] ? `${parent.enfants[0].prenom} ${parent.enfants[0].nomDeFamille}` : null,
      compteParentId: parent.id,
    },
  });

  void envoyerCourrielsDemandePrepaye(demande.id);

  return NextResponse.json({ ok: true }, { status: 201 });
}
