// app/api/menus/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { menuEstComplet } from '@/lib/menu-logic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const menu = await prisma.menu.findUnique({
    where: { id: params.id },
    include: {
      institution: true,
      thematiqueRef: true,
      journees: {
        include: { selections: { include: { repas: true }, orderBy: { createdAt: 'asc' } } },
        orderBy: { date: 'asc' },
      },
    },
  });

  if (!menu) return NextResponse.json({ error: 'Menu introuvable.' }, { status: 404 });

  return NextResponse.json({ ...menu, complet: menuEstComplet(menu.journees) });
}

// Modification des attributs du menu lui-même (pas de ses journées, qui
// passent par /api/journees/[journeeId]/selections). Sert à rattacher le
// menu à une thématique — le nom et l'image, eux, se modifient sur la
// thématique elle-même (voir /api/thematiques/[id]) — et à ajuster sa date
// de publication (voir estActivementPublie dans lib/menu-logic.ts).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: { thematiqueId?: string | null; datePublication?: Date | null } = {};

  if ('thematiqueId' in body) {
    data.thematiqueId = body.thematiqueId || null;
  }
  if ('datePublication' in body) {
    data.datePublication = body.datePublication ? new Date(body.datePublication) : null;
  }

  const menu = await prisma.menu.update({
    where: { id: params.id },
    data,
    include: { thematiqueRef: true },
  });
  return NextResponse.json(menu);
}
