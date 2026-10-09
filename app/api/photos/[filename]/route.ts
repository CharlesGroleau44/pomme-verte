// app/api/photos/[filename]/route.ts
// Sert les photos de repas, les logos d'institution et les prospectus PDF
// depuis le dossier persistant (voir lib/photos.ts).
//
// REDIMENSIONNEMENT (2026-08-12) — mesuré avant : une page de menu pesait
// 9,2 Mo, dont 9,06 Mo d'images. Christine téléverse ses photos telles que
// sorties de son téléphone (2 à 2,6 Mo chacune) et elles étaient servies
// pleine résolution pour être affichées dans 103 px de large. Sur un
// forfait cellulaire, c'est plusieurs secondes d'attente et une part réelle
// de données pour un parent qui commande dans la cour d'école.
//
// La route accepte donc « ?l=<largeur> ». La variante est calculée une
// seule fois puis écrite sur disque : les fois suivantes, on relit le
// fichier déjà réduit sans repasser par sharp. L'original reste intact —
// c'est lui que le PDF continue d'utiliser.
import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { PHOTOS_DIR } from '@/lib/photos';

const TYPES_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  // Le prospectus (dépliant PDF par institution, voir Institution.prospectusUrl)
  // partage le même dossier et la même route que les photos.
  pdf: 'application/pdf',
};

// Liste fermée : une largeur arbitraire dans l'URL laisserait n'importe qui
// remplir le disque de variantes en boucle. Ces trois tailles couvrent la
// vignette de journée, la carte de repas et le bandeau thématique, à 1x
// comme à 2x (voir les srcset dans les pages).
const LARGEURS = [160, 320, 640];
const CACHE = path.join(PHOTOS_DIR, 'variantes');

export async function GET(req: NextRequest, { params }: { params: { filename: string } }) {
  // path.basename empêche toute évasion du dossier (../../etc)
  const nomFichier = path.basename(params.filename);
  const extension = nomFichier.split('.').pop()?.toLowerCase() ?? '';
  const type = TYPES_MIME[extension];

  if (!type) {
    return NextResponse.json({ error: 'Type de fichier non supporté.' }, { status: 400 });
  }

  const demandee = Number(req.nextUrl.searchParams.get('l'));
  const largeur = LARGEURS.includes(demandee) ? demandee : null;
  const redimensionnable = largeur !== null && type !== 'application/pdf';

  const entetes = {
    'Content-Type': redimensionnable ? 'image/webp' : type,
    'Cache-Control': 'public, max-age=31536000, immutable',
  };

  try {
    if (!redimensionnable) {
      const octets = await readFile(path.join(PHOTOS_DIR, nomFichier));
      return new NextResponse(new Uint8Array(octets), { headers: entetes });
    }

    const variante = path.join(CACHE, `${largeur}-${nomFichier}.webp`);
    try {
      const dejaFaite = await readFile(variante);
      return new NextResponse(new Uint8Array(dejaFaite), { headers: entetes });
    } catch {
      // Première demande pour cette taille : on la fabrique et on la garde.
    }

    const original = await readFile(path.join(PHOTOS_DIR, nomFichier));
    const reduite = await sharp(original)
      // withoutEnlargement : une petite image (un logo de 250 px) ne doit
      // jamais être gonflée à 640 px, ce serait plus lourd pour rien.
      .resize({ width: largeur, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();

    await mkdir(CACHE, { recursive: true });
    await writeFile(variante, reduite);

    return new NextResponse(new Uint8Array(reduite), { headers: entetes });
  } catch {
    return NextResponse.json({ error: 'Photo introuvable.' }, { status: 404 });
  }
}
