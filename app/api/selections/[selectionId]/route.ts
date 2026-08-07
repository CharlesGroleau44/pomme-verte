// app/api/selections/[selectionId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const CHAMPS_OVERRIDE = [
  'nomOverride', 'descriptionOverride', 'photoUrlOverride',
  'prixPetitOverride', 'prixRegulierOverride', 'prixDeuxiemeServiceOverride',
] as const;

/**
 * Modifie les valeurs override d'une sélection (nom/description/prix
 * pour CETTE occurrence, sans toucher au repas maître). Un "reset"
 * (bouton Réinitialiser côté UI) envoie tous les champs à null.
 */
export async function PATCH(req: NextRequest, { params }: { params: { selectionId: string } }) {
  const body = await req.json();

  const data: Record<string, unknown> = {};
  for (const champ of CHAMPS_OVERRIDE) {
    if (champ in body) data[champ] = body[champ];
  }

  const selection = await prisma.menuJourneeSelection.update({
    where: { id: params.selectionId },
    data,
    include: { repas: true },
  });

  return NextResponse.json(selection);
}

/** Retire un repas d'une journée — il redevient sélectionnable pour celle-ci. */
export async function DELETE(_req: NextRequest, { params }: { params: { selectionId: string } }) {
  await prisma.menuJourneeSelection.delete({ where: { id: params.selectionId } });
  return NextResponse.json({ ok: true });
}
