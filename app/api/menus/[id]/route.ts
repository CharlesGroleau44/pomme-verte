// app/api/menus/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { menuEstComplet } from '@/lib/menu-logic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const menu = await prisma.menu.findUnique({
    where: { id: params.id },
    include: {
      institutions: { include: { institution: true } },
      journees: {
        include: { selections: { include: { repas: true }, orderBy: { createdAt: 'asc' } } },
        orderBy: { date: 'asc' },
      },
    },
  });

  if (!menu) return NextResponse.json({ error: 'Menu introuvable.' }, { status: 404 });

  return NextResponse.json({ ...menu, complet: menuEstComplet(menu.journees) });
}

/**
 * PATCH sur une journée précise du menu — ne gère plus que
 * "seulementPourInstitutions". Les sélections de repas (ajout,
 * modification, suppression) passent par /api/journees/[journeeId]/selections
 * et /api/selections/[selectionId] (une journée porte 0 à 2 sélections).
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  if (!body.journeeId) {
    return NextResponse.json({ error: 'journeeId requis.' }, { status: 400 });
  }
  if (!('seulementPourInstitutions' in body)) {
    return NextResponse.json({ error: 'seulementPourInstitutions requis.' }, { status: 400 });
  }

  const journee = await prisma.menuJournee.update({
    where: { id: body.journeeId, menuId: params.id },
    data: { seulementPourInstitutions: body.seulementPourInstitutions },
  });

  return NextResponse.json(journee);
}
