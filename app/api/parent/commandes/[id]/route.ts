// app/api/parent/commandes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { idParentDepuisCookie } from '@/lib/parent-session';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const compteParentId = await idParentDepuisCookie(req.cookies.get('pv_parent')?.value);
  if (!compteParentId) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const commande = await prisma.commande.findUnique({ where: { id: params.id } });
  if (!commande || commande.compteParentId !== compteParentId) {
    return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 });
  }

  await prisma.commande.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
