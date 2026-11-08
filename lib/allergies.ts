// lib/allergies.ts
// Texte d'allergies/intolérances d'un enfant, pour les listes imprimées.
// Les parents écrivent souvent « non », « aucune »… dans « autre intolérance » :
// affiché tel quel, ça devenait « — non » EN ROUGE à côté du nom (St-Pie X,
// Collins : Christine l'enlevait à la main, 7 novembre 2026).
const SANS_ALLERGIE = /^(non|no|aucune?|aucun|rien|n\/?a|nil|néant|neant|pas d'allergies?|sans|[-–—.]+)$/i;

export function autreIntoleranceUtile(valeur: string | null | undefined): string | null {
  const v = (valeur ?? '').trim();
  return v && !SANS_ALLERGIE.test(v) ? v : null;
}

export function texteAllergies(enfant: { intolerances: string[]; autreIntolerance: string | null }): string {
  return [...enfant.intolerances, autreIntoleranceUtile(enfant.autreIntolerance)].filter(Boolean).join(', ');
}
