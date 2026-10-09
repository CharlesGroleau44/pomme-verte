// app/api/calendriers/route.ts
// Calendriers scolaires — un par centre de services scolaire (ou école
// privée), partagé par les institutions qui en dépendent. Voir le
// commentaire du modèle CalendrierScolaire dans prisma/schema.prisma :
// pas d'import PDF dans l'app, la liste des jours fermés se corrige à la
// main ici (voir /admin/calendriers).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const calendriers = await prisma.calendrierScolaire.findMany({
    orderBy: { nom: 'asc' },
    include: { _count: { select: { institutions: true, joursFermes: true } } },
  });
  return NextResponse.json(calendriers);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const nom = String(body.nom ?? '').trim();
  if (!nom) {
    return NextResponse.json({ error: 'Le nom du calendrier est requis.' }, { status: 400 });
  }
  const calendrier = await prisma.calendrierScolaire.create({ data: { nom } });
  return NextResponse.json(calendrier, { status: 201 });
}
