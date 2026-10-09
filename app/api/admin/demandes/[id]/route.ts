// app/api/admin/demandes/[id]/route.ts
// Marquer une demande comme traitée (ou la rouvrir), et la supprimer.
// Rien ici n'active quoi que ce soit sur le compte du parent : l'entente
// et le solde prépayé restent activés à la main depuis /admin/parents,
// après réception du paiement — voir DemandePrepaye dans schema.prisma.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (typeof body.traitee !== 'boolean') {
    return NextResponse.json({ error: 'traitee doit être un booléen.' }, { status: 400 });
  }
  const demande = await prisma.demandePrepaye.update({
    where: { id: params.id },
    data: { traitee: body.traitee },
  });
  return NextResponse.json(demande);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.demandePrepaye.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
