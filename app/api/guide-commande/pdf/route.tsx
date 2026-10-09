// app/api/guide-commande/pdf/route.tsx
// Guide « comment commander en ligne » pour les parents — voir
// lib/pdf/GuideCommandeDocument.tsx. Contenu générique, aucune donnée de
// menu : accessible sans connexion (voir middleware.ts), pour que
// Christine et ses secrétaires puissent le joindre directement à leurs
// courriels.
import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { renderToBuffer } from '@react-pdf/renderer';
import GuideCommandeDocument, { type LogoPdf } from '@/lib/pdf/GuideCommandeDocument';

export const dynamic = 'force-dynamic';

export async function GET() {
  const logo: LogoPdf = await readFile(path.join(process.cwd(), 'public', 'logo.jpeg'))
    .then((data) => ({ data, format: 'jpg' as const }))
    .catch(() => null);

  const buffer = await renderToBuffer(<GuideCommandeDocument logo={logo} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="guide-commande-en-ligne.pdf"',
    },
  });
}
