// app/api/journees/[journeeId]/selections/route.ts
// Ajoute un choix de repas à une journée — une journée porte jusqu'à
// 2 sélections (au moins 1 requise pour que le menu soit complet).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { journeeId: string } }) {
  const body = await req.json();

  if (!body.repasId) {
    return NextResponse.json({ error: 'repasId requis.' }, { status: 400 });
  }

  const existantes = await prisma.menuJourneeSelection.findMany({ where: { journeeId: params.journeeId } });

  if (existantes.length >= 2) {
    return NextResponse.json({ error: 'Une journée ne peut porter plus de 2 repas.' }, { status: 409 });
  }
  if (existantes.some((s) => s.repasId === body.repasId)) {
    return NextResponse.json({ error: 'Ce repas est déjà choisi pour cette journée.' }, { status: 409 });
  }

  const selection = await prisma.menuJourneeSelection.create({
    data: { journeeId: params.journeeId, repasId: body.repasId },
    include: { repas: true },
  });

  return NextResponse.json(selection, { status: 201 });
}
