// app/api/calendriers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const calendrier = await prisma.calendrierScolaire.findUnique({
    where: { id: params.id },
    include: {
      joursFermes: { orderBy: { date: 'asc' } },
      institutions: { select: { id: true, nom: true } },
    },
  });
  if (!calendrier) return NextResponse.json({ error: 'Calendrier introuvable.' }, { status: 404 });
  return NextResponse.json(calendrier);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ('nom' in body) {
    const nom = String(body.nom ?? '').trim();
    if (!nom) return NextResponse.json({ error: 'Le nom du calendrier est requis.' }, { status: 400 });
    data.nom = nom;
  }
  const calendrier = await prisma.calendrierScolaire.update({ where: { id: params.id }, data });
  return NextResponse.json(calendrier);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  // Une institution qui dépend encore de ce calendrier est bloquée à la
  // suppression — la détacher d'abord (calendrierScolaireId: null) plutôt
  // que de la laisser pointer vers un calendrier qui n'existe plus.
  const utilise = await prisma.institution.findFirst({ where: { calendrierScolaireId: params.id } });
  if (utilise) {
    return NextResponse.json(
      { error: 'Au moins une institution utilise ce calendrier — détachez-la d\'abord.' },
      { status: 409 }
    );
  }
  await prisma.calendrierScolaire.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
