// app/api/menus/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { menuEstComplet } from '@/lib/menu-logic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const menu = await prisma.menu.findUnique({
    where: { id: params.id },
    include: {
      institution: true,
      journees: {
        include: { selections: { include: { repas: true }, orderBy: { createdAt: 'asc' } } },
        orderBy: { date: 'asc' },
      },
    },
  });

  if (!menu) return NextResponse.json({ error: 'Menu introuvable.' }, { status: 404 });

  return NextResponse.json({ ...menu, complet: menuEstComplet(menu.journees) });
}
