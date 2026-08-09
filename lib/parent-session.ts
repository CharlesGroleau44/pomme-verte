// lib/parent-session.ts
// Jeton de session PARENT — même mécanique que lib/session.ts (HMAC-SHA256
// via Web Crypto) mais un monde totalement séparé de la session admin :
// cookie différent (pv_parent), secret différent, et le jeton porte
// l'identité du compte (plusieurs parents possibles, contrairement à
// l'admin unique). Un parent ne peut jamais se retrouver authentifié
// côté /admin, ni l'inverse.
const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function cle(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
}

export async function creerJetonParent(compteParentId: string, secret: string): Promise<string> {
  const payload = `parent.${compteParentId}.${Date.now()}`;
  const signature = await crypto.subtle.sign('HMAC', await cle(secret), encoder.encode(payload));
  return `${payload}.${toHex(signature)}`;
}

/** Renvoie l'id du compte parent si le jeton est valide, sinon null. */
export async function idParentDuJeton(jeton: string | undefined, secret: string): Promise<string | null> {
  if (!jeton) return null;
  const parts = jeton.split('.');
  if (parts.length !== 4) return null;
  const [prefix, compteParentId, horodatage, signatureRecue] = parts;
  if (prefix !== 'parent' || !compteParentId) return null;
  const payload = `${prefix}.${compteParentId}.${horodatage}`;
  const signatureAttendue = await crypto.subtle.sign('HMAC', await cle(secret), encoder.encode(payload));
  return toHex(signatureAttendue) === signatureRecue ? compteParentId : null;
}

/** Même secret que la session admin (lib/session.ts) — préfixes de jeton distincts, aucune ambiguïté possible. */
export function secretSession(): string {
  return process.env.SESSION_SECRET ?? 'dev-secret-non-securise';
}

/** Lit et valide le cookie pv_parent à partir d'une valeur brute (route API ou Server Component). */
export async function idParentDepuisCookie(valeurCookie: string | undefined): Promise<string | null> {
  return idParentDuJeton(valeurCookie, secretSession());
}
