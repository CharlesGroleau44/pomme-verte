// lib/session.ts
// Jeton de session signé (HMAC-SHA256 via Web Crypto — compatible Node et Edge,
// donc utilisable à la fois dans les routes API et dans middleware.ts).

const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function cle(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
}

export async function creerJetonSession(secret: string): Promise<string> {
  const payload = `admin.${Date.now()}`;
  const signature = await crypto.subtle.sign('HMAC', await cle(secret), encoder.encode(payload));
  return `${payload}.${toHex(signature)}`;
}

export async function jetonValide(jeton: string | undefined, secret: string): Promise<boolean> {
  if (!jeton) return false;
  const parts = jeton.split('.');
  if (parts.length !== 3) return false;
  const [prefix, horodatage, signatureRecue] = parts;
  if (prefix !== 'admin') return false;
  const payload = `${prefix}.${horodatage}`;
  const signatureAttendue = await crypto.subtle.sign('HMAC', await cle(secret), encoder.encode(payload));
  return toHex(signatureAttendue) === signatureRecue;
}
