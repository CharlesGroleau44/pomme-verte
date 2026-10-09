// app/api/admin/registre/[id]/route.ts
// Annotation d'un élève du registre — entente annuelle / Fondation /
// allergie, voir lib/registre-eleves.ts.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ('ententeAnnuelle' in body) data.ententeAnnuelle = !!body.ententeAnnuelle;
  if ('fondation' in body) data.fondation = !!body.fondation;
  if ('allergie' in body) data.allergie = typeof body.allergie === 'string' && body.allergie.trim() ? body.allergie.trim() : null;
  if ('niveau' in body) {
    if (typeof body.niveau !== 'string' || !body.niveau.trim()) {
      return NextResponse.json({ error: 'Niveau invalide.' }, { status: 400 });
    }
    data.niveau = body.niveau.trim();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Aucun champ valide fourni.' }, { status: 400 });
  }

  const eleve = await prisma.eleveRegistre.update({ where: { id: params.id }, data });
  return NextResponse.json(eleve);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.eleveRegistre.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
