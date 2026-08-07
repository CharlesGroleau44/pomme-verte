// app/api/menus/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { genererJourneesOuvrables } from '@/lib/menu-logic';

export const dynamic = 'force-dynamic';

export async function GET() {
  const menus = await prisma.menu.findMany({
    orderBy: { periodeDebut: 'desc' },
    include: {
      institutions: { include: { institution: true } },
      journees: { include: { repas: true } },
    },
  });
  return NextResponse.json(menus);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Attendu : { periodeDebut, periodeFin, thematique, dateLimiteCommande, institutionIds: string[] }

  if (!body.periodeDebut || !body.periodeFin) {
    return NextResponse.json({ error: 'Les dates de début et de fin sont requises.' }, { status: 400 });
  }
  if (!Array.isArray(body.institutionIds) || body.institutionIds.length === 0) {
    return NextResponse.json({ error: 'Au moins une institution doit être sélectionnée.' }, { status: 400 });
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
      institutions: {
        create: body.institutionIds.map((institutionId: string) => ({ institutionId, publie: false })),
      },
      journees: {
        create: journees.map((j) => ({
          date: j.date,
          jourSemaine: j.jourSemaine,
          repasId: null,
          seulementPourInstitutions: [],
        })),
      },
    },
    include: {
      institutions: { include: { institution: true } },
      journees: { include: { repas: true } },
    },
  });

  return NextResponse.json(menu, { status: 201 });
}
