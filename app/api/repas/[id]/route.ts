// app/api/repas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  const repas = await prisma.repas.update({
    where: { id: params.id },
    data: {
      nom: body.nom,
      description: body.description,
      photoUrl: body.photoUrl,
      photoUrl2: body.photoUrl2,
      photoUrl3: body.photoUrl3,
      prixPetit: body.prixPetit,
      prixRegulier: body.prixRegulier,
      prixDeuxiemeService: body.prixDeuxiemeService,
      // institutionIds : liste complète — remplace l'association existante
      // (vide = disponible pour toutes les institutions).
      institutions: Array.isArray(body.institutionIds)
        ? { set: body.institutionIds.map((id: string) => ({ id })) }
        : undefined,
    },
    include: { institutions: true },
  });

  return NextResponse.json(repas);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  // Un repas utilisé dans au moins une sélection de journée est bloqué à
  // la suppression plutôt que de laisser des journées orphelines.
  // Voir §4 du briefing : décision produit à confirmer avec Charles —
  // l'alternative (autoriser + orpheliner) est un simple retrait de ce bloc.
  const utilise = await prisma.menuJourneeSelection.findFirst({ where: { repasId: params.id } });
  if (utilise) {
    return NextResponse.json(
      { error: 'Ce repas est utilisé dans au moins un menu et ne peut pas être supprimé.' },
      { status: 409 }
    );
  }

  await prisma.repas.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
