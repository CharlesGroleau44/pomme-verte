// app/api/parent/institutions/route.ts
// Liste publique minimale (id + nom) des institutions actives — pour le
// sélecteur d'école au moment d'ajouter un enfant. /api/institutions
// (admin) n'est pas accessible ici : ce sont deux mondes séparés.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const institutions = await prisma.institution.findMany({
    where: { actif: true },
    select: { id: true, nom: true, logoUrl: true },
    orderBy: { nom: 'asc' },
  });
  return NextResponse.json(institutions);
}
