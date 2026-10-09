// app/api/parent/mot-de-passe-oublie/route.ts
// Étape 1 du mot de passe oublié : émet un jeton à usage unique (1h) et
// envoie le lien de réinitialisation. Répond toujours par le même
// message de succès, que le courriel existe ou non — ne jamais laisser
// deviner quels courriels ont un compte (voir OWASP, énumération de comptes).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { genererJetonReinitialisation } from '@/lib/parent-auth';
import { envoyerReinitialisation } from '@/lib/courriels-envois';

export const dynamic = 'force-dynamic';

const MESSAGE_GENERIQUE = { ok: true, message: 'Si un compte existe avec ce courriel, un lien de réinitialisation vient de lui être envoyé.' };

export async function POST(req: NextRequest) {
  const body = await req.json();
  const courriel = typeof body.courriel === 'string' ? body.courriel.trim().toLowerCase() : '';
  if (!courriel) return NextResponse.json(MESSAGE_GENERIQUE);

  const parent = await prisma.compteParent.findUnique({ where: { courriel } });
  if (parent) {
    const resetToken = genererJetonReinitialisation();
    const resetTokenExpire = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await prisma.compteParent.update({ where: { id: parent.id }, data: { resetToken, resetTokenExpire } });

    const origine = process.env.SITE_URL ?? new URL(req.url).origin;
    const lien = `${origine}/parent/reinitialiser?jeton=${resetToken}`;
    await envoyerReinitialisation({ a: courriel, nom: parent.nom, lien });
  }

  return NextResponse.json(MESSAGE_GENERIQUE);
}
