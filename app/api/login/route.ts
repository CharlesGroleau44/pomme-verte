// app/api/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { creerJetonSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const usagerAttendu = process.env.ADMIN_USER ?? 'admin';
  const motDePasseAttendu = process.env.ADMIN_PASSWORD ?? 'admin';

  if (body.usager !== usagerAttendu || body.motDePasse !== motDePasseAttendu) {
    return NextResponse.json({ error: "Nom d'usager ou mot de passe invalide." }, { status: 401 });
  }

  const secret = process.env.SESSION_SECRET ?? 'dev-secret-non-securise';
  const jeton = await creerJetonSession(secret);

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
