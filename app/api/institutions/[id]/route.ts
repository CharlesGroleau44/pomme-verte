// app/api/institutions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if ('nom' in body) data.nom = body.nom;
  if ('logoUrl' in body) data.logoUrl = body.logoUrl;
  if ('actif' in body) data.actif = body.actif;

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
  const utilisee = await prisma.menuInstitution.findFirst({ where: { institutionId: params.id } });
  if (utilisee) {
    return NextResponse.json(
      { error: 'Cette institution est utilisée dans au moins un menu et ne peut pas être supprimée. Désactivez-la plutôt.' },
      { status: 409 }
    );
  }

  await prisma.institution.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
