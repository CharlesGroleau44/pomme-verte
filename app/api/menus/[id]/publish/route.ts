// app/api/menus/[id]/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { menuEstComplet } from '@/lib/menu-logic';

/**
 * Bascule la publication d'un menu pour UNE institution précise. La
 * publication est toujours par institution (voir MenuInstitution.publie)
 * — il n'existe pas de statut global "publié" sur le Menu lui-même.
 *
 * Refuse la publication (mais autorise toujours la dépublication)
 * si des journées du menu n'ont pas encore de repas assigné.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  // Attendu : { institutionId: string, publie: boolean }

  if (!body.institutionId || typeof body.publie !== 'boolean') {
    return NextResponse.json({ error: 'institutionId et publie (booléen) sont requis.' }, { status: 400 });
  }

  if (body.publie) {
    const journees = await prisma.menuJournee.findMany({
      where: { menuId: params.id },
      include: { selections: true },
    });
    if (!menuEstComplet(journees)) {
      return NextResponse.json(
        { error: 'Impossible de publier : au moins une journée du menu n\'a pas de repas assigné.' },
        { status: 422 }
      );
    }
  }

  const menuInstitution = await prisma.menuInstitution.update({
    where: { menuId_institutionId: { menuId: params.id, institutionId: body.institutionId } },
    data: { publie: body.publie },
    include: { institution: true },
  });

  return NextResponse.json(menuInstitution);
}
