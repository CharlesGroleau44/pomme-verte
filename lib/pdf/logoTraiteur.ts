// lib/pdf/logoTraiteur.ts
// Charge et redimensionne le logo (public/logo.jpeg) pour l'en-tête des PDF
// — extrait de app/api/commandes/rapport-pdf/route.tsx pour être réutilisé
// par les 6 routes de rapports de gestion sans dupliquer la lecture/resize.
import { readFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import type { PhotoResolue } from './MenuDocument';

export async function chargerLogoTraiteur(): Promise<PhotoResolue> {
  return readFile(path.join(process.cwd(), 'public', 'logo.jpeg'))
    .then((data) => sharp(data).resize(120, 120, { fit: 'inside' }).flatten({ background: '#FFFFFF' }).jpeg({ quality: 78 }).toBuffer())
    .then((data) => ({ data, format: 'jpg' as const }))
    .catch(() => null);
}
