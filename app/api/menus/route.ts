// app/api/menus/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { genererJourneesOuvrables } from '@/lib/menu-logic';

export const dynamic = 'force-dynamic';

export async function GET() {
  const menus = await prisma.menu.findMany({
    orderBy: { periodeDebut: 'desc' },
    include: {
      ecoles: { include: { ecole: true } },
      journees: { include: { repas: true } },
    },
  });
  return NextResponse.json(menus);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Attendu : { periodeDebut, periodeFin, thematique, dateLimiteCommande, ecoleIds: string[] }

  if (!body.periodeDebut || !body.periodeFin) {
    return NextResponse.json({ error: 'Les dates de début et de fin sont requises.' }, { status: 400 });
  }
  if (!Array.isArray(body.ecoleIds) || body.ecoleIds.length === 0) {
    return NextResponse.json({ error: 'Au moins une école doit être sélectionnée.' }, { status: 400 });
  }

  const debut = new Date(body.periodeDebut);
  const fin = new Date(body.periodeFin);
  const journees = genererJourneesOuvrables(debut, fin);

  const menu = await prisma.menu.create({
    data: {
      periodeDebut: debut,
      periodeFin: fin,
      thematique: body.thematique ?? null,
      dateLimiteCommande: body.dateLimiteCommande ? new Date(body.dateLimiteCommande) : null,
      pdfUrl: body.pdfUrl ?? null,
      ecoles: {
        create: body.ecoleIds.map((ecoleId: string) => ({ ecoleId, publie: false })),
      },
      journees: {
        create: journees.map((j) => ({
          date: j.date,
          jourSemaine: j.jourSemaine,
          repasId: null,
          seulementPourEcoles: [],
        })),
      },
    },
    include: {
      ecoles: { include: { ecole: true } },
      journees: { include: { repas: true } },
    },
  });

  return NextResponse.json(menu, { status: 201 });
}
