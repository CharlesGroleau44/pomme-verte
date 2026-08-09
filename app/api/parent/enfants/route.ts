// app/api/parent/enfants/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { idParentDepuisCookie } from '@/lib/parent-session';
import { NIVEAUX_VALIDES, INTOLERANCES_VALIDES } from '@/lib/commandes';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const compteParentId = await idParentDepuisCookie(req.cookies.get('pv_parent')?.value);
  if (!compteParentId) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const body = await req.json();
  const nomDeFamille = typeof body.nomDeFamille === 'string' ? body.nomDeFamille.trim() : '';
  const prenom = typeof body.prenom === 'string' ? body.prenom.trim() : '';
  const niveau = typeof body.niveau === 'string' ? body.niveau : '';
  const institutionId = typeof body.institutionId === 'string' ? body.institutionId : '';
  const intolerances = Array.isArray(body.intolerances)
    ? body.intolerances.filter((i: unknown) => typeof i === 'string' && INTOLERANCES_VALIDES.includes(i))
    : [];
  const autreIntolerance = typeof body.autreIntolerance === 'string' && body.autreIntolerance.trim() ? body.autreIntolerance.trim() : null;

  if (!nomDeFamille || !prenom) {
    return NextResponse.json({ error: 'Nom de famille et prénom sont requis.' }, { status: 400 });
  }
  if (!NIVEAUX_VALIDES.includes(niveau)) {
    return NextResponse.json({ error: 'Niveau invalide.' }, { status: 400 });
  }
  const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
  if (!institution || !institution.actif) {
    return NextResponse.json({ error: 'Institution invalide.' }, { status: 400 });
  }

  const enfant = await prisma.enfant.create({
    data: { compteParentId, nomDeFamille, prenom, niveau, institutionId, intolerances, autreIntolerance },
    include: { institution: true },
  });

  return NextResponse.json(enfant, { status: 201 });
}
