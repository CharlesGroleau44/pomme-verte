// app/api/admin/utilisateurs/[id]/route.ts
// Modifier un compte admin : nom, rôle, actif/inactif, ou réinitialiser
// son mot de passe (regénéré côté serveur, retourné une seule fois).
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { sessionValide } from '@/lib/session';
import { genererMotDePasse } from '@/lib/mot-de-passe';

export const dynamic = 'force-dynamic';

async function compteAdminRequis(req: NextRequest) {
  const secret = process.env.SESSION_SECRET ?? 'dev-secret-non-securise';
  const session = await sessionValide(req.cookies.get('pv_session')?.value, secret);
  if (!session) return null;
  const compte = await prisma.compteAdmin.findUnique({ where: { id: session.compteId } });
  if (!compte || !compte.actif || compte.role !== 'ADMIN') return null;
  return compte;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const demandeur = await compteAdminRequis(req);
  if (!demandeur) {
    return NextResponse.json({ error: 'Réservé aux comptes administrateur.' }, { status: 403 });
  }

  const cible = await prisma.compteAdmin.findUnique({ where: { id: params.id } });
  if (!cible) {
    return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 });
  }

  const body = await req.json();
  const data: { nom?: string; role?: 'ADMIN' | 'GESTIONNAIRE'; actif?: boolean; motDePasseHash?: string } = {};

  if (typeof body.nom === 'string' && body.nom.trim()) data.nom = body.nom.trim();
  if (body.role === 'ADMIN' || body.role === 'GESTIONNAIRE') data.role = body.role;
  if (typeof body.actif === 'boolean') {
    if (cible.id === demandeur.id && body.actif === false) {
      return NextResponse.json({ error: 'Impossible de désactiver votre propre compte.' }, { status: 400 });
    }
    data.actif = body.actif;
  }
  if (cible.id === demandeur.id && data.role === 'GESTIONNAIRE') {
    return NextResponse.json({ error: 'Impossible de retirer votre propre accès administrateur.' }, { status: 400 });
  }

  let motDePasse: string | undefined;
  if (body.reinitialiserMotDePasse === true) {
    motDePasse = genererMotDePasse();
    data.motDePasseHash = await bcrypt.hash(motDePasse, 10);
  }

  const compte = await prisma.compteAdmin.update({
    where: { id: params.id },
    data,
    select: { id: true, nom: true, courriel: true, role: true, actif: true, createdAt: true },
  });

  return NextResponse.json({ compte, motDePasse });
}
