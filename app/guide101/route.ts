// app/guide101/route.ts
// Le guide 101 (public/guide101.html) est un fichier statique généré à part
// (captures d'écran annotées, voir présentations similaires). Next.js, en
// mode standalone, ne sert pas les fichiers .html du dossier public/ — ils
// passent par le routeur de pages et retombent sur le 404. On le sert donc
// nous-mêmes via ce route handler, en lisant le fichier sur disque.
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'guide101.html');
  const html = fs.readFileSync(filePath, 'utf-8');
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
