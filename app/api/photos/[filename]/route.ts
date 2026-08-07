// app/api/photos/[filename]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { PHOTOS_DIR } from '@/lib/photos';

const TYPES_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export async function GET(_req: NextRequest, { params }: { params: { filename: string } }) {
  // path.basename empêche toute évasion du dossier (../../etc)
  const nomFichier = path.basename(params.filename);
  const extension = nomFichier.split('.').pop()?.toLowerCase() ?? '';
  const type = TYPES_MIME[extension];

  if (!type) {
    return NextResponse.json({ error: 'Type de fichier non supporté.' }, { status: 400 });
  }

  try {
    const octets = await readFile(path.join(PHOTOS_DIR, nomFichier));
    return new NextResponse(new Uint8Array(octets), {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Photo introuvable.' }, { status: 404 });
  }
}
