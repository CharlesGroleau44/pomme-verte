// app/api/admin/institutions/[id]/registre/route.ts
// Liste des élèves du registre officiel d'une institution — voir
// lib/registre-eleves.ts.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const eleves = await prisma.eleveRegistre.findMany({
    where: { institutionId: params.id },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  });
  return NextResponse.json(eleves);
}
