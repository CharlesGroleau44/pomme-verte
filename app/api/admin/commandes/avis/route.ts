// app/api/admin/commandes/avis/route.ts
// Avis ponctuel envoyé aux parents d'une sélection de commandes — depuis
// /admin/commandes (mode sélection). Un seul courriel par PARENT même si
// plusieurs commandes sélectionnées appartiennent à la même famille
// (ex. deux enfants touchés par la même situation).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { envoyerAvisPersonnalise } from '@/lib/courriels-envois';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const commandeIds = Array.isArray(body.commandeIds) ? body.commandeIds.filter((id: unknown) => typeof id === 'string') : [];
  const sujet = typeof body.sujet === 'string' ? body.sujet.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (commandeIds.length === 0) return NextResponse.json({ error: 'Aucune commande sélectionnée.' }, { status: 400 });
  if (!sujet) return NextResponse.json({ error: 'Le sujet est requis.' }, { status: 400 });
  if (!message) return NextResponse.json({ error: 'Le message est requis.' }, { status: 400 });

  const commandes = await prisma.commande.findMany({
    where: { id: { in: commandeIds } },
    include: { compteParent: true },
  });

  // Dédoublonné par compte parent — deux commandes du même parent (deux
  // enfants) ne doivent produire qu'un seul courriel.
  const parents = new Map(commandes.map((c) => [c.compteParentId, c.compteParent]));

  await Promise.all(
    Array.from(parents.values()).map((p) => envoyerAvisPersonnalise({ a: p.courriel, nom: p.nom, sujet, message }))
  );

  return NextResponse.json({ envoyes: parents.size });
}
