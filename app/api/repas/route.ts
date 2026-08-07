// app/api/repas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const repas = await prisma.repas.findMany({ orderBy: { nom: 'asc' } });
  return NextResponse.json(repas);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.nom || typeof body.nom !== 'string') {
    return NextResponse.json({ error: 'Le nom du repas est requis.' }, { status: 400 });
  }

  const repas = await prisma.repas.create({
    data: {
      nom: body.nom,
      description: body.description ?? null,
      photoUrl: body.photoUrl ?? null,
      prixPetit: body.prixPetit ?? 6.5,
      prixRegulier: body.prixRegulier ?? 7.0,
      prixDeuxiemeService: body.prixDeuxiemeService ?? 10.0,
    },
  });

  return NextResponse.json(repas, { status: 201 });
}
