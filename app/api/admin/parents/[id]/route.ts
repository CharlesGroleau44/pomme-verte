// app/api/admin/parents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (typeof body.prepayeAnnuel !== 'boolean') {
    return NextResponse.json({ error: 'prepayeAnnuel doit être un booléen.' }, { status: 400 });
  }
  const parent = await prisma.compteParent.update({
    where: { id: params.id },
    data: { prepayeAnnuel: body.prepayeAnnuel },
  });
  return NextResponse.json(parent);
}
