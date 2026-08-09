// app/api/parent/reinitialiser/route.ts
// Étape 2 du mot de passe oublié : vérifie le jeton (non expiré, à usage
// unique — retiré dès qu'il est consommé) et fixe le nouveau mot de
// passe. Reconnecte directement le parent, comme à l'inscription.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hacherMotDePasse } from '@/lib/parent-auth';
import { creerJetonParent, secretSession } from '@/lib/parent-session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const jeton = typeof body.jeton === 'string' ? body.jeton : '';
  const motDePasse = typeof body.motDePasse === 'string' ? body.motDePasse : '';

  if (!jeton) return NextResponse.json({ error: 'Lien invalide.' }, { status: 400 });
  if (motDePasse.length < 8) {
    return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' }, { status: 400 });
  }

  const parent = await prisma.compteParent.findUnique({ where: { resetToken: jeton } });
  if (!parent || !parent.resetTokenExpire || parent.resetTokenExpire < new Date()) {
    return NextResponse.json({ error: 'Ce lien est invalide ou expiré. Refaites une demande.' }, { status: 400 });
  }

  const motDePasseHash = await hacherMotDePasse(motDePasse);
  await prisma.compteParent.update({
    where: { id: parent.id },
    data: { motDePasseHash, resetToken: null, resetTokenExpire: null },
  });

  const nouveauJeton = await creerJetonParent(parent.id, secretSession());
  const res = NextResponse.json({ ok: true });
  res.cookies.set('pv_parent', nouveauJeton, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  });
  return res;
}
