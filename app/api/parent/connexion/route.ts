// app/api/parent/connexion/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifierMotDePasse } from '@/lib/parent-auth';
import { creerJetonParent, secretSession } from '@/lib/parent-session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const courriel = typeof body.courriel === 'string' ? body.courriel.trim().toLowerCase() : '';
  const motDePasse = typeof body.motDePasse === 'string' ? body.motDePasse : '';

  const parent = await prisma.compteParent.findUnique({ where: { courriel } });
  if (!parent || !(await verifierMotDePasse(motDePasse, parent.motDePasseHash))) {
    return NextResponse.json({ error: 'Courriel ou mot de passe invalide.' }, { status: 401 });
  }

  const jeton = await creerJetonParent(parent.id, secretSession());

  const res = NextResponse.json({ id: parent.id, courriel: parent.courriel, nom: parent.nom });
  res.cookies.set('pv_parent', jeton, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  });
  return res;
}
