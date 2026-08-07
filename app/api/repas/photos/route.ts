// app/api/repas/photos/route.ts
// Téléversement d'une photo de repas (principale ou l'une des deux
// additionnelles). Retourne l'URL à stocker sur le Repas
// (photoUrl / photoUrl2 / photoUrl3) — servie ensuite par
// GET /api/photos/[filename].
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { PHOTOS_DIR, TYPES_ACCEPTES, TAILLE_MAX_OCTETS, assurerDossierPhotos } from '@/lib/photos';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const fichier = formData.get('fichier');

  if (!(fichier instanceof File)) {
    return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 });
  }

  const extension = TYPES_ACCEPTES[fichier.type];
  if (!extension) {
    return NextResponse.json({ error: 'Format non supporté (JPEG, PNG ou WebP seulement).' }, { status: 400 });
  }

  if (fichier.size > TAILLE_MAX_OCTETS) {
    return NextResponse.json({ error: 'Le fichier dépasse la taille maximale de 8 Mo.' }, { status: 400 });
  }

  await assurerDossierPhotos();

  const nomFichier = `${crypto.randomUUID()}.${extension}`;
  const octets = Buffer.from(await fichier.arrayBuffer());
  await writeFile(path.join(PHOTOS_DIR, nomFichier), octets);

  return NextResponse.json({ url: `/api/photos/${nomFichier}` }, { status: 201 });
}
