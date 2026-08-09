// app/api/institutions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const CHAMPS_FICHE = [
  'nom', 'logoUrl', 'actif', 'adresse', 'ville', 'province', 'codePostal',
  'telephone', 'courriel', 'siteWeb',
  'personneContact', 'telephoneContact', 'courrielContact',
  'notes',
] as const;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const institution = await prisma.institution.findUnique({ where: { id: params.id } });
  if (!institution) return NextResponse.json({ error: 'Institution introuvable.' }, { status: 404 });
  return NextResponse.json(institution);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  const data: Record<string, unknown> = {};
  for (const champ of CHAMPS_FICHE) {
    if (champ in body) data[champ] = body[champ];
  }
  if ('offreFondation' in body) data.offreFondation = !!body.offreFondation;
  if ('offreFormatPetit' in body) data.offreFormatPetit = !!body.offreFormatPetit;

  const institution = await prisma.institution.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(institution);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  // Une institution utilisée dans au moins un menu est bloquée à la
  // suppression (même logique que pour un repas) — la désactiver
  // (actif: false) est l'alternative sans casser l'historique des menus.
  const utilisee = await prisma.menu.findFirst({ where: { institutionId: params.id } });
  if (utilisee) {
    return NextResponse.json(
      { error: 'Cette institution est utilisée dans au moins un menu et ne peut pas être supprimée. Désactivez-la plutôt.' },
      { status: 409 }
    );
  }

  await prisma.institution.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
