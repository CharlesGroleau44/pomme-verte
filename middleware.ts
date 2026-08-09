// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { jetonValide } from '@/lib/session';

export async function middleware(req: NextRequest) {
  const secret = process.env.SESSION_SECRET ?? 'dev-secret-non-securise';
  const jeton = req.cookies.get('pv_session')?.value;

  if (await jetonValide(jeton, secret)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url);
}

// /menus (espace PUBLIC — ce que les parents voient, voir app/menus/),
// /api/photos (logos + photos de repas affichés sur ces pages publiques)
// et /api/menus/[id]/pdf (le PDF brandé, dont l'accès est en fait
// vérifié par la route elle-même selon estActivementPublie — voir
// app/api/menus/[id]/pdf/route.tsx) ne demandent jamais de connexion
// ADMIN. /parent et /api/parent non plus — c'est un monde totalement
// séparé avec sa PROPRE authentification (cookie pv_parent, voir
// lib/parent-session.ts), vérifiée par chaque page/route parent
// elle-même, jamais par ce middleware. Tout le reste (/admin/*,
// /api/institutions, /api/repas, /api/menus hors pdf, /api/upload…)
// passe par le login admin.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.jpeg|login|api/login|menus|api/photos|api/menus/[^/]+/pdf|parent|api/parent).*)',
  ],
};
