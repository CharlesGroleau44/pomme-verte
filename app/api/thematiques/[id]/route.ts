// app/api/thematiques/[id]/route.ts
// Renommer une thématique ou changer son image met à jour TOUS les
// menus qui la portent, sans avoir à les rouvrir un par un — c'est le
// but même de l'entité (voir prisma/schema.prisma).
//
// Pas de DELETE : une thématique déjà utilisée par des menus passés doit
// rester, sinon on réécrirait l'historique. Pour changer de thématique,
// on en crée simplement une nouvelle.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: { nom?: string; photoUrl?: string | null } = {};

  if ('nom' in body) {
    const nom = String(body.nom ?? '').trim();
    if (!nom) {
      return NextResponse.json({ error: 'Le nom ne peut pas être vide.' }, { status: 400 });
    }
    data.nom = nom;
  }
  if ('photoUrl' in body) {
    data.photoUrl = body.photoUrl || null;
  }

  const thematique = await prisma.thematique.update({ where: { id: params.id }, data });
  return NextResponse.json(thematique);
}
