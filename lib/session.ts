// lib/session.ts
// Jeton de session signé (HMAC-SHA256 via Web Crypto — compatible Node et Edge,
// donc utilisable à la fois dans les routes API et dans middleware.ts).
// Le jeton porte l'identité du compte connecté (compteId + role), pour que
// middleware.ts puisse restreindre certaines routes par rôle sans avoir à
// interroger la base (le rôle est vérifié une seconde fois côté route, en
// défense en profondeur — voir app/api/admin/utilisateurs/route.ts).

export type SessionPayload = { compteId: string; role: string };

const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toBase64Url(texte: string): string {
  const b64 = btoa(unescape(encodeURIComponent(texte)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64url: string): string {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const paddee = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  return decodeURIComponent(escape(atob(paddee)));
}

async function cle(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
}

export async function creerJetonSession(secret: string, donnees: SessionPayload): Promise<string> {
  const donneesEncodees = toBase64Url(JSON.stringify(donnees));
  const payload = `admin.${donneesEncodees}.${Date.now()}`;
  const signature = await crypto.subtle.sign('HMAC', await cle(secret), encoder.encode(payload));
  return `${payload}.${toHex(signature)}`;
}

export async function sessionValide(jeton: string | undefined, secret: string): Promise<SessionPayload | null> {
  if (!jeton) return null;
  const parts = jeton.split('.');
  if (parts.length !== 4) return null;
  const [prefix, donneesEncodees, horodatage, signatureRecue] = parts;
  if (prefix !== 'admin') return null;
  const payload = `${prefix}.${donneesEncodees}.${horodatage}`;
  const signatureAttendue = await crypto.subtle.sign('HMAC', await cle(secret), encoder.encode(payload));
  if (toHex(signatureAttendue) !== signatureRecue) return null;
  try {
    const donnees = JSON.parse(fromBase64Url(donneesEncodees));
    if (typeof donnees?.compteId !== 'string' || typeof donnees?.role !== 'string') return null;
    return donnees as SessionPayload;
  } catch {
    return null;
  }
}
