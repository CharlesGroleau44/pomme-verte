// app/api/commandes/[id]/route.ts
// Bascule le statut de paiement d'une commande — le paiement lui-même
// reste hors ligne (argent/chèque/Interac/entente, voir modePaiement),
// ceci ne fait que confirmer qu'il a été reçu. Protégé par le
// middleware admin par défaut.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { prixLigne, selectionVersTexte } from '@/lib/menu-logic';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (typeof body.paye !== 'boolean') {
    return NextResponse.json({ error: 'paye (booléen) est requis.' }, { status: 400 });
  }

  // Cocher « payé » = tout le total actuel est reçu : on le mémorise
  // (montantPaye) pour que de futurs ajouts tardifs ne fassent redevenir dû
  // que le nouveau repas, pas la commande entière — voir lib/paiement.ts.
  let montantPaye: number | null = null;
  if (body.paye) {
    const lignes = await prisma.ligneCommande.findMany({
      where: { commandeId: params.id },
      include: { selection: { include: { repas: true } } },
    });
    montantPaye = lignes.reduce((s, l) => s + prixLigne(l, selectionVersTexte(l.selection)), 0);
  }

  const commande = await prisma.commande.update({
    where: { id: params.id },
    data: { paye: body.paye, payeLe: body.paye ? new Date() : null, montantPaye },
  });

  return NextResponse.json(commande);
}
