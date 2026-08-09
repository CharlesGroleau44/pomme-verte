// app/api/commandes/[id]/route.ts
// Bascule le statut de paiement d'une commande — le paiement lui-même
// reste hors ligne (argent/chèque/Interac/entente, voir modePaiement),
// ceci ne fait que confirmer qu'il a été reçu. Protégé par le
// middleware admin par défaut.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (typeof body.paye !== 'boolean') {
    return NextResponse.json({ error: 'paye (booléen) est requis.' }, { status: 400 });
  }

  const commande = await prisma.commande.update({
    where: { id: params.id },
    data: { paye: body.paye, payeLe: body.paye ? new Date() : null },
  });

  return NextResponse.json(commande);
}
