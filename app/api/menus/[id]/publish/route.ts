// app/api/menus/[id]/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { menuEstComplet, finDeJournee } from '@/lib/menu-logic';

/**
 * Bascule la publication d'un menu — un seul bouton, puisqu'un menu
 * n'appartient qu'à une seule institution (voir schema.prisma).
 *
 * Refuse la publication (mais autorise toujours la dépublication) si
 * des journées n'ont pas encore de repas assigné, OU si la date limite
 * de commande est déjà passée (republier exigerait d'abord de la
 * repousser — sans quoi le menu redeviendrait immédiatement invisible,
 * voir estActivementPublie()).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  // Attendu : { publie: boolean }

  if (typeof body.publie !== 'boolean') {
    return NextResponse.json({ error: 'publie (booléen) est requis.' }, { status: 400 });
  }

  if (body.publie) {
    const menu = await prisma.menu.findUnique({
      where: { id: params.id },
      include: { journees: { include: { selections: true } } },
    });
    if (!menu) return NextResponse.json({ error: 'Menu introuvable.' }, { status: 404 });

    if (!menuEstComplet(menu.journees)) {
      return NextResponse.json(
        { error: 'Impossible de publier : au moins une journée du menu n\'a pas de repas assigné.' },
        { status: 422 }
      );
    }
    if (new Date() > finDeJournee(menu.dateLimiteCommande)) {
      return NextResponse.json(
        { error: 'La date limite de commande de ce menu est déjà passée — repoussez-la avant de publier.' },
        { status: 422 }
      );
    }
  }

  const menu = await prisma.menu.update({
    where: { id: params.id },
    data: { publie: body.publie },
    include: { institution: true },
  });

  return NextResponse.json(menu);
}
