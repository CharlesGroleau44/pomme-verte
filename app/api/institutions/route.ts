// app/api/institutions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const institutions = await prisma.institution.findMany({ orderBy: { nom: 'asc' } });
  return NextResponse.json(institutions);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.nom || typeof body.nom !== 'string') {
    return NextResponse.json({ error: 'Le nom de l\'institution est requis.' }, { status: 400 });
  }

  const institution = await prisma.institution.create({
    data: {
      nom: body.nom,
      logoUrl: body.logoUrl ?? null,
    },
  });

  return NextResponse.json(institution, { status: 201 });
}
