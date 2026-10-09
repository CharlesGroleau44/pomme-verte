// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { sessionValide } from '@/lib/session';

// /admin/utilisateurs (et son API) gère les comptes admin eux-mêmes — la
// seule chose qu'un compte GESTIONNAIRE ne doit jamais pouvoir toucher
// (voir prisma/schema.prisma, RoleAdmin). Réservé au rôle ADMIN.
const CHEMIN_RESERVE_ADMIN = /^\/(admin\/utilisateurs|api\/admin\/utilisateurs)/;

export async function middleware(req: NextRequest) {
  const secret = process.env.SESSION_SECRET ?? 'dev-secret-non-securise';
  const jeton = req.cookies.get('pv_session')?.value;
  const session = await sessionValide(jeton, secret);

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (CHEMIN_RESERVE_ADMIN.test(req.nextUrl.pathname) && session.role !== 'ADMIN') {
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Réservé aux comptes administrateur.' }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/admin/menus';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// /menus (espace PUBLIC — ce que les parents voient, voir app/menus/),
// /api/photos (logos + photos de repas affichés sur ces pages publiques)
// et /api/menus/[id]/pdf (le PDF brandé, dont l'accès est en fait
// vérifié par la route elle-même selon estActivementPublie — voir
// app/api/menus/[id]/pdf/route.tsx) ne demandent jamais de connexion
// ADMIN. /parent et /api/parent non plus — c'est un monde totalement
// séparé avec sa PROPRE authentification (cookie pv_parent, voir
// lib/parent-session.ts), vérifiée par chaque page/route parent
// elle-même, jamais par ce middleware. /guide101 (voir app/guide101/route.ts,
// qui sert public/guide101.html — Next standalone ne sert pas les .html de
// public/ directement) est le guide pas-à-pas envoyé à la cliente — public
// aussi, aucune raison de lui faire créer un compte pour le consulter.
// /api/guide-commande (voir app/api/guide-commande/pdf/route.tsx) est le
// guide PDF « comment commander en ligne » destiné aux parents — même
// logique, public, aucune donnée de menu, contenu générique.
// /api/taches est appelé par le cron du VPS, pas par un humain connecté :
// il s'authentifie avec l'en-tête X-Tache-Secret vérifié par la route
// elle-même (voir app/api/taches/rappel-date-limite/route.ts), qui refuse
// tout si TACHE_SECRET n'est pas configuré. Tout le reste (/admin/*,
// /api/institutions, /api/repas, /api/menus hors pdf, /api/upload…) passe
// par le login admin.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.jpeg|guide101|login|api/login|menus|api/photos|api/menus/[^/]+/pdf|api/guide-commande|parent|api/parent|api/taches).*)',
  ],
};
