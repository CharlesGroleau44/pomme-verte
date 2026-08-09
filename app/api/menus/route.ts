// app/api/menus/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { genererJourneesOuvrables } from '@/lib/menu-logic';

export const dynamic = 'force-dynamic';

export async function GET() {
  const menus = await prisma.menu.findMany({
    orderBy: { periodeDebut: 'desc' },
    include: {
      institution: true,
      journees: { include: { selections: true } },
    },
  });
  return NextResponse.json(menus);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Attendu : { periodeDebut, periodeFin, thematique, dateLimiteCommande, institutionId }
  // Un menu appartient à UNE SEULE institution — pour servir le même
  // contenu à une autre, voir POST /api/menus/[id]/dupliquer.

  if (!body.periodeDebut || !body.periodeFin) {
    return NextResponse.json({ error: 'Les dates de début et de fin sont requises.' }, { status: 400 });
  }
  if (!body.dateLimiteCommande) {
    return NextResponse.json({ error: 'La date limite de commande est requise.' }, { status: 400 });
  }
  if (!body.institutionId) {
    return NextResponse.json({ error: 'Une institution doit être sélectionnée.' }, { status: 400 });
  }

  const debut = new Date(body.periodeDebut);
  const fin = new Date(body.periodeFin);
  const journees = genererJourneesOuvrables(debut, fin);

  const menu = await prisma.menu.create({
    data: {
      institutionId: body.institutionId,
      periodeDebut: debut,
      periodeFin: fin,
      thematique: body.thematique ?? null,
      dateLimiteCommande: new Date(body.dateLimiteCommande),
      pdfUrl: body.pdfUrl ?? null,
      journees: {
        create: journees.map((j) => ({ date: j.date, jourSemaine: j.jourSemaine })),
      },
    },
    include: {
      institution: true,
      journees: { include: { selections: true } },
    },
  });

  return NextResponse.json(menu, { status: 201 });
}
