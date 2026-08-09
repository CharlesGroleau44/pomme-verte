// app/api/parent/mot-de-passe-oublie/route.ts
// Étape 1 du mot de passe oublié : émet un jeton à usage unique (1h) et
// envoie le lien de réinitialisation. Répond toujours par le même
// message de succès, que le courriel existe ou non — ne jamais laisser
// deviner quels courriels ont un compte (voir OWASP, énumération de comptes).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { genererJetonReinitialisation } from '@/lib/parent-auth';
import { envoyerCourriel } from '@/lib/courriel';

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
    await envoyerCourriel({
      a: courriel,
      sujet: 'Réinitialisation de votre mot de passe — Traiteur La Pomme Verte',
      texte: `Bonjour ${parent.nom},\n\nPour choisir un nouveau mot de passe, cliquez sur ce lien (valide 1 heure) :\n${lien}\n\nSi vous n'avez pas demandé cette réinitialisation, ignorez ce courriel.`,
    });
  }

  return NextResponse.json(MESSAGE_GENERIQUE);
}
