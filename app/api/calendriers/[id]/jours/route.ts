// app/api/calendriers/[id]/jours/route.ts
// Bascule un jour ouvert/fermé sur un calendrier — POST avec la même date
// deux fois l'ouvre puis le referme (create/delete sur la contrainte
// unique [calendrierScolaireId, date]), pour que la grille /admin/calendriers
// puisse cliquer une case sans se soucier de son état courant.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const date = typeof body.date === 'string' ? body.date : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Date invalide (AAAA-MM-JJ attendu).' }, { status: 400 });
  }

  const existant = await prisma.jourFermeCalendrier.findUnique({
    where: { calendrierScolaireId_date: { calendrierScolaireId: params.id, date: new Date(`${date}T00:00:00Z`) } },
  });

  if (existant) {
    await prisma.jourFermeCalendrier.delete({ where: { id: existant.id } });
    return NextResponse.json({ ferme: false });
  }

  await prisma.jourFermeCalendrier.create({
    data: {
      calendrierScolaireId: params.id,
      date: new Date(`${date}T00:00:00Z`),
      motif: typeof body.motif === 'string' && body.motif.trim() ? body.motif.trim() : null,
    },
  });
  return NextResponse.json({ ferme: true });
}
