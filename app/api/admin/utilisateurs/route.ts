// app/api/admin/utilisateurs/route.ts
// Gestion des comptes admin (CompteAdmin) — réservé au rôle ADMIN.
// middleware.ts bloque déjà ce chemin pour les GESTIONNAIRE à partir du
// rôle embarqué dans le jeton de session ; on revérifie ici avec une
// lecture fraîche en base (défense en profondeur — un rôle rétrogradé ou
// un compte désactivé perd l'accès immédiatement, sans attendre
// l'expiration du jeton déjà émis).
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

export async function GET(req: NextRequest) {
  if (!(await compteAdminRequis(req))) {
    return NextResponse.json({ error: 'Réservé aux comptes administrateur.' }, { status: 403 });
  }
  const comptes = await prisma.compteAdmin.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, nom: true, courriel: true, role: true, actif: true, createdAt: true },
  });
  return NextResponse.json(comptes);
}

export async function POST(req: NextRequest) {
  if (!(await compteAdminRequis(req))) {
    return NextResponse.json({ error: 'Réservé aux comptes administrateur.' }, { status: 403 });
  }

  const body = await req.json();
  const nom = String(body.nom ?? '').trim();
  const courriel = String(body.courriel ?? '').trim().toLowerCase();
  const role = body.role === 'ADMIN' ? 'ADMIN' : 'GESTIONNAIRE';

  if (!nom || !courriel) {
    return NextResponse.json({ error: 'Nom et courriel requis.' }, { status: 400 });
  }

  const existant = await prisma.compteAdmin.findUnique({ where: { courriel } });
  if (existant) {
    return NextResponse.json({ error: 'Un compte existe déjà avec ce courriel.' }, { status: 409 });
  }

  const motDePasse = genererMotDePasse();
  const motDePasseHash = await bcrypt.hash(motDePasse, 10);

  const compte = await prisma.compteAdmin.create({
    data: { nom, courriel, role, motDePasseHash },
    select: { id: true, nom: true, courriel: true, role: true, actif: true, createdAt: true },
  });

  return NextResponse.json({ compte, motDePasse });
}
