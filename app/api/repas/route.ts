// app/api/repas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const repas = await prisma.repas.findMany({
    orderBy: { nom: 'asc' },
    include: { institutions: true },
  });
  return NextResponse.json(repas);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // institutionIds : institutions pouvant recevoir ce repas — vide = toutes.

  if (!body.nom || typeof body.nom !== 'string') {
    return NextResponse.json({ error: 'Le nom du repas est requis.' }, { status: 400 });
  }

  const repas = await prisma.repas.create({
    data: {
      nom: body.nom,
      description: body.description ?? null,
      photoUrl: body.photoUrl ?? null,
      photoUrl2: body.photoUrl2 ?? null,
      photoUrl3: body.photoUrl3 ?? null,
      prixPetit: body.prixPetit ?? 6.5,
      prixRegulier: body.prixRegulier ?? 7.0,
      prixDeuxiemeService: body.prixDeuxiemeService ?? 10.0,
      institutions: Array.isArray(body.institutionIds)
        ? { connect: body.institutionIds.map((id: string) => ({ id })) }
        : undefined,
    },
    include: { institutions: true },
  });

  return NextResponse.json(repas, { status: 201 });
}
