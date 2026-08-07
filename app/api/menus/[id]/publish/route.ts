// app/api/menus/[id]/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { menuEstComplet } from '@/lib/menu-logic';

/**
 * Bascule la publication d'un menu pour UNE école précise. La
 * publication est toujours par école (voir MenuEcole.publie) — il
 * n'existe pas de statut global "publié" sur le Menu lui-même.
 *
 * Refuse la publication (mais autorise toujours la dépublication)
 * si des journées du menu n'ont pas encore de repas assigné.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  // Attendu : { ecoleId: string, publie: boolean }

  if (!body.ecoleId || typeof body.publie !== 'boolean') {
    return NextResponse.json({ error: 'ecoleId et publie (booléen) sont requis.' }, { status: 400 });
  }

  if (body.publie) {
    const journees = await prisma.menuJournee.findMany({ where: { menuId: params.id } });
    if (!menuEstComplet(journees)) {
      return NextResponse.json(
        { error: 'Impossible de publier : au moins une journée du menu n\'a pas de repas assigné.' },
        { status: 422 }
      );
    }
  }

  const menuEcole = await prisma.menuEcole.update({
    where: { menuId_ecoleId: { menuId: params.id, ecoleId: body.ecoleId } },
    data: { publie: body.publie },
    include: { ecole: true },
  });

  return NextResponse.json(menuEcole);
}
