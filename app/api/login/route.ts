// app/api/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { creerJetonSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const courriel = String(body.usager ?? '').trim().toLowerCase();
  const motDePasse = String(body.motDePasse ?? '');

  const compte = await prisma.compteAdmin.findUnique({ where: { courriel } });
  const motDePasseValide = compte ? await bcrypt.compare(motDePasse, compte.motDePasseHash) : false;

  if (!compte || !compte.actif || !motDePasseValide) {
    return NextResponse.json({ error: "Nom d'usager ou mot de passe invalide." }, { status: 401 });
  }

  const secret = process.env.SESSION_SECRET ?? 'dev-secret-non-securise';
  const jeton = await creerJetonSession(secret, { compteId: compte.id, role: compte.role });

  const res = NextResponse.json({ ok: true });
  res.cookies.set('pv_session', jeton, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 jours
  });
  return res;
}
