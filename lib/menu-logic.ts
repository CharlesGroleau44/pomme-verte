// lib/menu-logic.ts
// Logique partagée entre les routes API et les pages. Isolée ici
// pour rester testable indépendamment de Next.js / Prisma.

const JOURS_SEMAINE = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/**
 * Génère un jour par jour ouvrable (lundi à vendredi) entre deux
 * dates inclusivement. Utilisé à la création d'un menu pour peupler
 * automatiquement les MenuJournee — sans sélection de repas, à
 * assigner ensuite par l'utilisatrice.
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
 * Résout les valeurs effectives d'affichage d'une sélection : les
 * champs *Override priment s'ils sont renseignés, sinon on retombe
 * sur le repas maître lié.
 */
export function resoudreSelection(selection: {
  repas: {
    nom: string; description: string | null; photoUrl: string | null;
    prixPetit: string; prixRegulier: string; prixDeuxiemeService: string;
  };
  nomOverride: string | null;
  descriptionOverride: string | null;
  photoUrlOverride: string | null;
  prixPetitOverride: string | null;
  prixRegulierOverride: string | null;
  prixDeuxiemeServiceOverride: string | null;
}) {
  return {
    nom: selection.nomOverride ?? selection.repas.nom,
    description: selection.descriptionOverride ?? selection.repas.description,
    photoUrl: selection.photoUrlOverride ?? selection.repas.photoUrl,
    prixPetit: selection.prixPetitOverride ?? selection.repas.prixPetit,
    prixRegulier: selection.prixRegulierOverride ?? selection.repas.prixRegulier,
    prixDeuxiemeService: selection.prixDeuxiemeServiceOverride ?? selection.repas.prixDeuxiemeService,
    estModifiee: Boolean(
      selection.nomOverride || selection.descriptionOverride || selection.photoUrlOverride ||
      selection.prixPetitOverride || selection.prixRegulierOverride || selection.prixDeuxiemeServiceOverride
    ),
  };
}

/**
 * Un menu ne peut être publié que si TOUTES ses journées ont au moins
 * une sélection de repas. Utilisé côté API avant d'honorer une
 * demande de publication, et côté front pour désactiver le bouton
 * "Publier" / afficher les journées incomplètes en rouge.
 */
export function menuEstComplet(journees: { selections: unknown[] }[]) {
  return journees.length > 0 && journees.every((j) => j.selections.length > 0);
}

/**
 * Détermine si une journée s'applique à une institution donnée : un
 * tableau seulementPourInstitutions vide signifie "toutes les
 * institutions du menu" ; sinon, seules les institutions listées
 * voient cette journée. Utilisé côté formulaire de commande (module
 * suivant) — inclus ici car la règle est définie au niveau du menu.
 */
export function journeeApplicableA(journee: { seulementPourInstitutions: string[] }, institutionId: string) {
  return journee.seulementPourInstitutions.length === 0 || journee.seulementPourInstitutions.includes(institutionId);
}
