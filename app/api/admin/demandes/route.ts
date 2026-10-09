// app/api/admin/demandes/route.ts
// Les demandes de prépaiement, créées à l'inscription ou en un clic par un
// parent connecté (voir POST /api/parent/inscription et POST
// /api/parent/moi/demande-prepaye). Sous /api/admin, donc couvert par
// l'auth admin du middleware.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const demandes = await prisma.demandePrepaye.findMany({
    orderBy: [{ traitee: 'asc' }, { createdAt: 'desc' }],
    include: { institution: { select: { nom: true } } },
  });
  return NextResponse.json(demandes);
}
