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

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.jpeg|login|api/login).*)'],
};
