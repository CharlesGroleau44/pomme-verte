// app/api/admin/parents/[id]/depots/route.ts
// Un dépôt = un paiement reçu hors ligne (argent, chèque, virement) que
// Christine crédite au compte du parent — voir lib/solde-prepaye.ts. Écrit
// ici seulement ; jamais modifié après coup, voir DELETE dans [depotId].
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const montant = Number(body.montant);
  if (!Number.isFinite(montant) || montant <= 0) {
    return NextResponse.json({ error: 'Le montant doit être un nombre positif.' }, { status: 400 });
  }

  const parent = await prisma.compteParent.findUnique({ where: { id: params.id } });
  if (!parent) return NextResponse.json({ error: 'Parent introuvable.' }, { status: 404 });
  if (!parent.soldePrepayeActif) {
    return NextResponse.json({ error: 'Ce parent n\'est pas en mode solde prépayé.' }, { status: 422 });
  }

  const depot = await prisma.depotPrepaye.create({
    data: { compteParentId: params.id, montant: montant.toFixed(2) },
  });
  return NextResponse.json(depot, { status: 201 });
}
