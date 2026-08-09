// lib/parent-auth.ts
// Hachage des mots de passe parents — scrypt (module natif Node, aucune
// dépendance ajoutée), sel aléatoire par mot de passe, comparaison en
// temps constant. Uniquement utilisé côté route API (runtime Node).
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback) as (motDePasse: string, sel: string, taille: number) => Promise<Buffer>;

export async function hacherMotDePasse(motDePasse: string): Promise<string> {
  const sel = randomBytes(16).toString('hex');
  const derive = await scrypt(motDePasse, sel, 64);
  return `${sel}:${derive.toString('hex')}`;
}

export async function verifierMotDePasse(motDePasse: string, hash: string): Promise<boolean> {
  const [sel, cleHex] = hash.split(':');
  if (!sel || !cleHex) return false;
  const derive = await scrypt(motDePasse, sel, 64);
  const attendu = Buffer.from(cleHex, 'hex');
  if (derive.length !== attendu.length) return false;
  return timingSafeEqual(derive, attendu);
}

/** Jeton opaque à usage unique pour la réinitialisation de mot de passe — voir CompteParent.resetToken. */
export function genererJetonReinitialisation(): string {
  return randomBytes(32).toString('hex');
}
