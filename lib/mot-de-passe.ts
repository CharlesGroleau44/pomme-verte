// lib/mot-de-passe.ts
// Génération de mots de passe robustes côté serveur — utilisé à la création
// d'un CompteAdmin et à la réinitialisation (voir app/api/admin/utilisateurs).
// Le mot de passe en clair n'est jamais stocké : il n'est retourné qu'une
// seule fois, dans la réponse de l'appel qui vient de le générer.
import crypto from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export function genererMotDePasse(longueur = 20): string {
  const octets = crypto.randomBytes(longueur);
  let motDePasse = '';
  for (let i = 0; i < longueur; i++) {
    motDePasse += ALPHABET[octets[i] % ALPHABET.length];
  }
  return motDePasse;
}
