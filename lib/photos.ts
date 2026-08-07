// lib/photos.ts
// Stockage disque des photos de repas. PHOTOS_DIR pointe vers un
// dossier PERSISTANT hors du bundle déployé (voir DEPLOIEMENT-VPS.md) —
// jamais écrasé par un déploiement, contrairement à /opt/pommeverte/actuel.
import { mkdir } from 'fs/promises';
import path from 'path';

export const PHOTOS_DIR = process.env.PHOTOS_DIR ?? path.join(process.cwd(), 'data', 'photos');

export const TYPES_ACCEPTES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const TAILLE_MAX_OCTETS = 8 * 1024 * 1024; // 8 Mo

export async function assurerDossierPhotos() {
  await mkdir(PHOTOS_DIR, { recursive: true });
}
