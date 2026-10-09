// app/api/admin/moi/route.ts
// Identité du compte admin connecté — utilisé par Sidebar.tsx pour afficher
// "Connecté comme {nom}" et pour savoir s'il faut montrer le lien
// Utilisateurs (réservé au rôle ADMIN, voir middleware.ts).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sessionValide } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = process.env.SESSION_SECRET ?? 'dev-secret-non-securise';
  const session = await sessionValide(req.cookies.get('pv_session')?.value, secret);
  if (!session) {
    return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });
  }

  const compte = await prisma.compteAdmin.findUnique({
    where: { id: session.compteId },
    select: { id: true, nom: true, courriel: true, role: true },
  });
  if (!compte) {
    return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 });
  }
  return NextResponse.json(compte);
}
