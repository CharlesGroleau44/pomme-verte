// app/api/admin/parents/[id]/depots/[depotId]/route.ts
// Correction d'une erreur de saisie sur un dépôt — le registre reste
// d'écriture seule dans son usage normal, mais une saisie fautive doit
// pouvoir être retirée plutôt que de fausser le solde en permanence.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; depotId: string } }) {
  const depot = await prisma.depotPrepaye.findUnique({ where: { id: params.depotId } });
  if (!depot || depot.compteParentId !== params.id) {
    return NextResponse.json({ error: 'Dépôt introuvable.' }, { status: 404 });
  }
  await prisma.depotPrepaye.delete({ where: { id: params.depotId } });
  return NextResponse.json({ ok: true });
}
