// lib/menu-logic.ts
// Logique partagée entre les routes API et les pages. Isolée ici
// pour rester testable indépendamment de Next.js / Prisma.

const JOURS_SEMAINE = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/**
 * Les dates de journée (@db.Date) sont stockées à minuit UTC. Le serveur
 * tourne en UTC donc un rendu server-side les affiche correctement, mais
 * un composant client exécuté dans un navigateur au Québec (UTC-4/-5)
 * reculerait d'un jour avec `new Date(iso).getDate()` — TOUJOURS utiliser
 * cette fonction (ou getUTCDate() directement) pour un affichage de date
 * de journée côté client.
 */
export function jourDuMoisUTC(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getUTCDate();
}

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

/** La date limite de commande couvre toute sa journée — jusqu'à 23h59min59s. */
export function finDeJournee(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

/**
 * Un menu n'est réellement visible/commandable que si l'admin l'a publié
 * ET que sa date limite de commande n'est pas encore passée — passé
 * cette date à 23h59, le menu redevient invisible même si "publie" est
 * toujours vrai en base, pour qu'aucune commande n'entre en retard.
 * C'est cet état-ci, pas le simple booléen "publie", qui doit gouverner
 * tout ce qui est montré aux parents. dateLimiteCommande est obligatoire
 * à la création du menu (voir schema.prisma) — jamais nulle ici.
 */
export function estActivementPublie(menu: { publie: boolean; dateLimiteCommande: Date }): boolean {
  if (!menu.publie) return false;
  return new Date() <= finDeJournee(menu.dateLimiteCommande);
}
