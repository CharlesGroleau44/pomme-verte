// app/api/admin/parents/route.ts
// Profils des comptes parents — lecture seule côté liste (la bascule
// "Prépayé à l'année" se fait via PATCH /api/admin/parents/[id]). Sous
// /api/admin, donc couvert par l'auth admin standard du middleware
// (contrairement à /api/parent/*, qui est l'espace public parent).
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const parents = await prisma.compteParent.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { enfants: true, commandes: true } },
    },
  });
  return NextResponse.json(parents);
}
