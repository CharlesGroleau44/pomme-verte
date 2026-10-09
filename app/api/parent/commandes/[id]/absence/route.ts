// app/api/parent/commandes/[id]/absence/route.ts
// Signale l'absence de l'enfant pour une journée déjà commandée — voir
// lib/absence.ts pour la mécanique de crédit (elle varie selon le mode de
// paiement de la commande). Réservé au parent propriétaire de la commande.
import { NextRequest, NextResponse } from 'next/server';
import { idParentDepuisCookie } from '@/lib/parent-session';
import { accorderAbsence, ErreurAbsence } from '@/lib/absence';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const compteParentId = await idParentDepuisCookie(req.cookies.get('pv_parent')?.value);
  if (!compteParentId) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const body = await req.json();
  const journeeId = typeof body.journeeId === 'string' ? body.journeeId : '';
  if (!journeeId) return NextResponse.json({ error: 'journeeId est requis.' }, { status: 400 });

  try {
    const resultat = await accorderAbsence(compteParentId, params.id, journeeId);
    return NextResponse.json(resultat);
  } catch (err) {
    if (err instanceof ErreurAbsence) {
      return NextResponse.json({ error: err.message }, { status: err.statut });
    }
    throw err;
  }
}
