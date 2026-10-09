// lib/images.ts
// Demande à /api/photos une variante à la bonne taille plutôt que l'original.
//
// Contexte : Christine téléverse ses photos telles que sorties du téléphone
// (2 à 2,6 Mo). Affichées dans 128 px de large, elles faisaient à elles
// seules 9 Mo sur une page de menu — l'essentiel du poids, et l'essentiel
// de l'attente pour un parent sur cellulaire.
//
// Les largeurs doivent rester dans la liste fermée acceptée par la route
// (160 / 320 / 640), sinon le paramètre est ignoré et l'original repart.

export type LargeurPhoto = 160 | 320 | 640;

const SUIVANTE: Record<LargeurPhoto, LargeurPhoto> = { 160: 320, 320: 640, 640: 640 };

/**
 * Attributs à étaler sur une balise <img>.
 *
 * `largeur` = la taille d'affichage réelle en CSS px, pas la taille du
 * fichier d'origine. Le srcset ajoute la variante double pour les écrans
 * à haute densité, qui sont la norme sur téléphone.
 *
 * Les URL externes ou déjà paramétrées sont rendues telles quelles.
 */
export function photo(url: string, largeur: LargeurPhoto): { src: string; srcSet?: string } {
  if (!url.startsWith('/api/photos/') || url.includes('?')) return { src: url };
  const doublee = SUIVANTE[largeur];
  return {
    src: `${url}?l=${largeur}`,
    // Pas de « 2x » quand la variante double est la même que la simple :
    // ce serait dire au navigateur de télécharger deux fois le même fichier.
    srcSet: doublee === largeur ? undefined : `${url}?l=${largeur} 1x, ${url}?l=${doublee} 2x`,
  };
}
