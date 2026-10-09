// app/api/admin/parents/[id]/route.ts
// Solde prépayé libre — reste au niveau du COMPTE (partagé entre les
// enfants). L'entente annuelle, elle, est PAR ENFANT depuis le 17 août
// 2026 — voir PATCH /api/admin/enfants/[id]/route.ts.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ('soldePrepayeActif' in body) {
    if (typeof body.soldePrepayeActif !== 'boolean') {
      return NextResponse.json({ error: 'soldePrepayeActif doit être un booléen.' }, { status: 400 });
    }
    data.soldePrepayeActif = body.soldePrepayeActif;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Aucun champ valide fourni.' }, { status: 400 });
  }

  const parent = await prisma.compteParent.update({ where: { id: params.id }, data });
  return NextResponse.json(parent);
}
