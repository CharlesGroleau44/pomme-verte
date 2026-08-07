// lib/menu-logic.ts
// Logique partagée entre les routes API et les pages. Isolée ici
// pour rester testable indépendamment de Next.js / Prisma.

const JOURS_SEMAINE = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/**
 * Génère un jour par jour ouvrable (lundi à vendredi) entre deux
 * dates inclusivement. Utilisé à la création d'un menu pour peupler
 * automatiquement les MenuJournee — repasId reste null, à assigner
 * ensuite par l'utilisatrice.
 */
export function genererJourneesOuvrables(debut: Date, fin: Date) {
  const journees: { date: Date; jourSemaine: string }[] = [];
  const cur = new Date(debut);

  while (cur <= fin) {
    const jourNum = cur.getDay(); // 0 = dimanche, 6 = samedi
    if (jourNum >= 1 && jourNum <= 5) {
      journees.push({ date: new Date(cur), jourSemaine: JOURS_SEMAINE[jourNum] });
    }
    cur.setDate(cur.getDate() + 1);
  }

  return journees;
}

/**
 * Résout les valeurs effectives d'affichage d'une journée : les
 * champs *Override priment s'ils sont renseignés, sinon on retombe
 * sur le repas maître lié. Un jour sans repasId ET sans override
 * est considéré incomplet (bloque la publication — voir menuEstComplet).
 */
export function resoudreJournee(journee: {
  repas: { nom: string; description: string | null; photoUrl: string | null } | null;
  nomOverride: string | null;
  descriptionOverride: string | null;
  photoUrlOverride: string | null;
}) {
  return {
    nom: journee.nomOverride ?? journee.repas?.nom ?? null,
    description: journee.descriptionOverride ?? journee.repas?.description ?? null,
    photoUrl: journee.photoUrlOverride ?? journee.repas?.photoUrl ?? null,
    estModifiee: Boolean(journee.nomOverride || journee.descriptionOverride || journee.photoUrlOverride),
  };
}

/**
 * Un menu ne peut être publié que si TOUTES ses journées ont un
 * repas assigné (repasId non nul). Utilisé côté API avant d'honorer
 * une demande de publication, et côté front pour désactiver le
 * bouton "Publier" / afficher les journées incomplètes en rouge.
 */
export function menuEstComplet(journees: { repasId: string | null }[]) {
  return journees.length > 0 && journees.every((j) => j.repasId !== null);
}

/**
 * Détermine si une journée s'applique à une école donnée : un
 * tableau seulementPourEcoles vide signifie "toutes les écoles du
 * menu" ; sinon, seules les écoles listées voient cette journée.
 * Utilisé côté formulaire de commande (module suivant) — inclus ici
 * car la règle est définie au niveau du menu.
 */
export function journeeApplicableA(journee: { seulementPourEcoles: string[] }, ecoleId: string) {
  return journee.seulementPourEcoles.length === 0 || journee.seulementPourEcoles.includes(ecoleId);
}
