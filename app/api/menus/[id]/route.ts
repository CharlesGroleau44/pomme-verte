// app/api/menus/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { menuEstComplet } from '@/lib/menu-logic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const menu = await prisma.menu.findUnique({
    where: { id: params.id },
    include: {
      institutions: { include: { institution: true } },
      journees: { include: { repas: true }, orderBy: { date: 'asc' } },
    },
  });

  if (!menu) return NextResponse.json({ error: 'Menu introuvable.' }, { status: 404 });

  return NextResponse.json({ ...menu, complet: menuEstComplet(menu.journees) });
}

/**
 * PATCH sur une journée précise du menu. Deux cas d'usage distincts :
 *
 * 1. Assignation d'un repas (sélection dans l'inventaire) :
 *    { journeeId, repasId } — efface aussi les *Override existants,
 *    puisque changer de repas repart d'une base propre.
 *
 * 2. Modification à la volée SANS changer le repas maître :
 *    { journeeId, nomOverride?, descriptionOverride?, photoUrlOverride? }
 *    — repasId reste inchangé.
 *
 * Un "reset" (bouton Réinitialiser côté UI) envoie les trois champs
 * *Override à null explicitement.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  if (!body.journeeId) {
    return NextResponse.json({ error: 'journeeId requis.' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if ('repasId' in body) {
    data.repasId = body.repasId;
    data.nomOverride = null;
    data.descriptionOverride = null;
    data.photoUrlOverride = null;
  } else {
    if ('nomOverride' in body) data.nomOverride = body.nomOverride;
    if ('descriptionOverride' in body) data.descriptionOverride = body.descriptionOverride;
    if ('photoUrlOverride' in body) data.photoUrlOverride = body.photoUrlOverride;
  }

  if ('seulementPourInstitutions' in body) data.seulementPourInstitutions = body.seulementPourInstitutions;

  const journee = await prisma.menuJournee.update({
    where: { id: body.journeeId, menuId: params.id },
    data,
    include: { repas: true },
  });

  return NextResponse.json(journee);
}
