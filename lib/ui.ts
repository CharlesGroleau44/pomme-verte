// lib/ui.ts
// Classes d'interface partagées. Elles étaient recopiées à l'identique dans
// une dizaine de fichiers, ce qui a laissé passer un défaut mobile pendant
// des semaines : les champs étaient en text-sm (14 px), et Safari iOS zoome
// automatiquement sur tout champ sous 16 px dès qu'on le touche — la page
// saute, et elle ne redescend pas toute seule. Le parent tape son adresse
// courriel sur une page soudainement agrandie.
//
// D'où « text-base sm:text-sm » : 16 px sur téléphone (aucun zoom), et la
// taille compacte d'origine dès qu'il y a de la place, à partir de sm.
//
// Toute nouvelle saisie doit importer d'ici plutôt que recopier la chaîne.

/** Champ de saisie standard : pleine largeur, avec la marge du dessus. */
export const CHAMP =
  'w-full border border-pomme-line/50 rounded-xl px-3.5 py-2.5 text-base sm:text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40 focus:border-pomme-apple-deep transition-shadow';

/** Idem, sans w-full ni marge — pour les grilles qui gèrent leur largeur. */
export const CHAMP_NU =
  'border border-pomme-line/50 rounded-xl px-3.5 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40 focus:border-pomme-apple-deep transition-shadow';

/** Version dense, pour les grilles serrées de la console (montage de menu). */
export const CHAMP_DENSE =
  'w-full border border-pomme-line/50 rounded-lg px-2.5 py-1.5 text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40 focus:border-pomme-apple-deep';

/**
 * Cible tactile minimale. 44 px est le seuil sous lequel un bouton se rate
 * au pouce — ne pas descendre plus bas sur un élément qu'un parent touche.
 */
export const CIBLE_TACTILE = 'min-h-[44px]';

/** Pastille de choix (niveau scolaire, intolérance, mode de paiement). */
export function classePastille(actif: boolean): string {
  return `press ${CIBLE_TACTILE} px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
    actif
      ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep shadow-soft scale-105'
      : 'bg-white border-pomme-line/60 text-pomme-ink/85 hover:border-pomme-apple-mid hover:text-pomme-apple-deep'
  }`;
}

/** Lien discret (retour, « voir plus ») ramené à une vraie cible tactile. */
export const LIEN_TACTILE = `press inline-flex items-center ${CIBLE_TACTILE} -ml-1 px-1`;
