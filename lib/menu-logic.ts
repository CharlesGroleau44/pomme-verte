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
 * Règle de Christine pour le crédit d'absence (courriel du 13 août 2026) :
 * « le parent doit nous envoyer un courriel avant 8h30 au plus tard le
 * matin de l'absence ». Le seuil se juge à l'heure du Québec, pas celle du
 * serveur (UTC) ni celle du navigateur d'un parent en voyage — d'où
 * Intl.DateTimeFormat avec un fuseau explicite plutôt que Date.getHours().
 *
 * Utilisée à la fois côté serveur (pour accorder ou refuser le crédit) et
 * côté client (pour n'afficher le bouton que lorsqu'il servirait à
 * quelque chose) — la validation serveur reste la seule qui compte,
 * l'affichage client n'est qu'une commodité.
 */
export function absenceEncoreAccordable(dateJournee: Date | string): boolean {
  const jourJournee = (typeof dateJournee === 'string' ? dateJournee : dateJournee.toISOString()).slice(0, 10);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Montreal',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const val = (t: string) => parts.find((p) => p.type === t)!.value;
  const jourQuebec = `${val('year')}-${val('month')}-${val('day')}`;

  if (jourQuebec > jourJournee) return false; // le jour est déjà passé
  if (jourQuebec < jourJournee) return true; // jour futur : toujours accordable

  const heureMinute = parseInt(val('hour'), 10) * 60 + parseInt(val('minute'), 10);
  return heureMinute < 8 * 60 + 30; // le jour même : seulement avant 8h30
}

/**
 * Date limite de commande suggérée à partir du premier jour servi.
 *
 * Règle de Christine (courriel du 10 août 2026) : « la date limite est
 * toujours le vendredi/samedi minuit avant le repas du lundi ». On
 * retourne donc le vendredi qui précède STRICTEMENT le premier repas —
 * la fermeture réelle se fait à 23 h 59 ce vendredi-là (voir
 * finDeJournee), ce qui est exactement « samedi minuit ».
 *
 * Simple suggestion, jamais une contrainte : elle a une exception assumée
 * pour le premier menu de l'année, où les commandes sont acceptées
 * jusqu'au jour 1. La date reste modifiable à la main.
 *
 * @param premierJour date du premier repas servi (AAAA-MM-JJ ou Date)
 * @returns la date au format AAAA-MM-JJ, prête pour un <input type="date">
 */
export function dateLimiteSuggeree(premierJour: Date | string): string {
  const d = typeof premierJour === 'string' ? new Date(`${premierJour}T00:00:00Z`) : new Date(premierJour);
  // On recule d'au moins un jour, puis jusqu'au vendredi (getUTCDay() === 5).
  do {
    d.setUTCDate(d.getUTCDate() - 1);
  } while (d.getUTCDay() !== 5);
  return d.toISOString().slice(0, 10);
}

/**
 * Génère un jour par jour ouvrable (lundi à vendredi) entre deux dates
 * inclusivement, en sautant les journées fermées du calendrier scolaire de
 * l'institution (pédagogiques, congés — voir CalendrierScolaire). Utilisé à
 * la création d'un menu pour peupler automatiquement les MenuJournee — sans
 * sélection de repas, à assigner ensuite par l'utilisatrice.
 *
 * @param joursFermes dates ISO (AAAA-MM-JJ) à exclure — vide si
 *   l'institution n'a pas de calendrier rattaché, comportement inchangé.
 */
export function genererJourneesOuvrables(debut: Date, fin: Date, joursFermes: Set<string> = new Set()) {
  const journees: { date: Date; jourSemaine: string }[] = [];
  const exclues: string[] = [];
  const cur = new Date(debut);

  while (cur <= fin) {
    const jourNum = cur.getDay(); // 0 = dimanche, 6 = samedi
    if (jourNum >= 1 && jourNum <= 5) {
      const iso = cur.toISOString().slice(0, 10);
      if (joursFermes.has(iso)) {
        exclues.push(iso);
      } else {
        journees.push({ date: new Date(cur), jourSemaine: JOURS_SEMAINE[jourNum] });
      }
    }
    cur.setDate(cur.getDate() + 1);
  }

  return { journees, exclues };
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
 * Prix effectif d'une ligne de commande selon sa taille — même résolution
 * que resoudreSelection (overrides puis repas maître), appliquée au champ
 * demandé. Centralisé ici pour ne pas se dupliquer entre le solde prépayé
 * (lib/solde-prepaye.ts), l'espace parent (app/parent/compte/utils.ts) et
 * les courriels (lib/courriels-envois.ts).
 */
export function prixSelonTaille(taille: string, selection: Parameters<typeof resoudreSelection>[0]): number {
  const r = resoudreSelection(selection);
  const prix = taille === 'PETIT' ? r.prixPetit : taille === 'DEUXIEME_SERVICE' ? r.prixDeuxiemeService : r.prixRegulier;
  return parseFloat(prix);
}

/**
 * Prix effectif d'une ligne, override d'abord — une commande tardive
 * (voir LigneCommande.prixOverride, lib/commandes.ts::enregistrerCommandeTardive)
 * fige son propre tarif dépannage, indépendant du repas/de la taille
 * choisis pour cette ligne. Toute lecture de prix qui passe par une vraie
 * ligne de commande (rapports, classeur cuisine, solde prépayé, courriels)
 * doit appeler CETTE fonction plutôt que prixSelonTaille directement, sinon
 * une commande tardive se ferait facturer au tarif régulier du repas.
 */
export function prixLigne(
  ligne: { taille: string; prixOverride?: unknown },
  selection: Parameters<typeof resoudreSelection>[0]
): number {
  if (ligne.prixOverride !== null && ligne.prixOverride !== undefined) {
    return typeof ligne.prixOverride === 'number' ? ligne.prixOverride : parseFloat(String(ligne.prixOverride));
  }
  return prixSelonTaille(ligne.taille, selection);
}

/**
 * Date du jour au Québec, au format AAAA-MM-JJ — comparable directement à
 * un champ @db.Date de Prisma (toujours minuit UTC de la date voulue).
 * Même technique que absenceEncoreAccordable plus haut.
 */
export function aujourdhuiQuebec(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Montreal', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const val = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${val('year')}-${val('month')}-${val('day')}`;
}

/**
 * Une journée de menu est-elle encore commandable tardivement — aujourd'hui
 * ou plus tard, jamais un jour déjà servi (voir Christine, 8-9 septembre
 * 2026 : « chaque jour au tarif dépannage » pour ce qui reste de la
 * semaine, jamais un repas déjà passé).
 */
export function estJourAVenirOuAujourdhui(dateJournee: Date | string): boolean {
  const jourJournee = (typeof dateJournee === 'string' ? dateJournee : dateJournee.toISOString()).slice(0, 10);
  return jourJournee >= aujourdhuiQuebec();
}

/**
 * Convertit une sélection chargée directement depuis Prisma (prix en
 * Decimal) vers le format texte attendu par resoudreSelection/
 * prixSelonTaille — Prisma ne sérialise ses Decimal en string qu'au
 * passage JSON, jamais en mémoire côté serveur. Nécessaire chaque fois
 * qu'on résout un prix sans passer par une route API (voir
 * lib/solde-prepaye.ts, chargerEtValiderMenu dans lib/commandes.ts).
 */
export function selectionVersTexte(selection: {
  nomOverride: string | null; descriptionOverride: string | null; photoUrlOverride: string | null;
  prixPetitOverride: unknown; prixRegulierOverride: unknown; prixDeuxiemeServiceOverride: unknown;
  repas: { nom: string; description: string | null; photoUrl: string | null; prixPetit: unknown; prixRegulier: unknown; prixDeuxiemeService: unknown };
}): Parameters<typeof resoudreSelection>[0] {
  return {
    nomOverride: selection.nomOverride,
    descriptionOverride: selection.descriptionOverride,
    photoUrlOverride: selection.photoUrlOverride,
    prixPetitOverride: selection.prixPetitOverride == null ? null : String(selection.prixPetitOverride),
    prixRegulierOverride: selection.prixRegulierOverride == null ? null : String(selection.prixRegulierOverride),
    prixDeuxiemeServiceOverride: selection.prixDeuxiemeServiceOverride == null ? null : String(selection.prixDeuxiemeServiceOverride),
    repas: {
      nom: selection.repas.nom,
      description: selection.repas.description,
      photoUrl: selection.repas.photoUrl,
      prixPetit: String(selection.repas.prixPetit),
      prixRegulier: String(selection.repas.prixRegulier),
      prixDeuxiemeService: String(selection.repas.prixDeuxiemeService),
    },
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
 * Décalage (en minutes, ex. -240 pour UTC-4) d'un fuseau donné à un instant
 * précis — nécessaire pour franchir minuit heure locale correctement des
 * deux côtés d'un changement d'heure (DST), plutôt que de coder en dur un
 * décalage fixe qui serait faux la moitié de l'année.
 */
function decalageMinutes(instantUTCms: number, fuseau: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: fuseau, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(instantUTCms));
  const val = (t: string) => parseInt(parts.find((p) => p.type === t)!.value, 10);
  const commeUTC = Date.UTC(val('year'), val('month') - 1, val('day'), val('hour') % 24, val('minute'), val('second'));
  return (commeUTC - instantUTCms) / 60000;
}

/**
 * La date limite de commande couvre toute sa journée — jusqu'à 23h59min59s
 * **heure du Québec**, pas UTC. Une date limite codée en UTC fermait les
 * commandes 4h (heure d'été) ou 5h (heure d'hiver) trop tôt par rapport à
 * ce qu'un parent au Québec s'attend — bug signalé par Christine (courriel
 * du 5 septembre 2026 : des parents pouvaient commander en soirée, d'autres
 * non, selon l'heure exacte où l'horloge UTC avait déjà basculé au
 * lendemain). Même prudence que absenceEncoreAccordable plus haut, avec la
 * même technique (Intl.DateTimeFormat avec fuseau explicite) — mais
 * gérant en plus un changement d'heure DST à l'intérieur du calcul.
 */
export function finDeJournee(date: Date): Date {
  // Minuit UTC "naïf" du lendemain sert de sonde pour déterminer le
  // décalage horaire réel de Montréal à ce moment — fiable même à cheval
  // sur un changement d'heure, puisque ce dernier survient toujours à 2h
  // du matin heure locale, jamais à minuit.
  const lendemainMinuitNaifMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
  const decalage = decalageMinutes(lendemainMinuitNaifMs, 'America/Montreal');
  // Minuit heure de Montréal le lendemain, converti en UTC, moins 1 ms =
  // 23h59min59,999s heure de Montréal le jour demandé.
  const minuitLendemainMontrealEnUTC = lendemainMinuitNaifMs - decalage * 60000;
  return new Date(minuitLendemainMontrealEnUTC - 1);
}

/**
 * Un menu accepte-t-il encore des commandes ? L'admin doit l'avoir publié,
 * sa date de publication (si renseignée) doit être arrivée, ET sa date
 * limite de commande ne doit pas être passée — passé cette date à 23h59
 * heure du Québec, plus aucune commande n'entre, même si "publie" reste
 * vrai en base. N'utiliser CETTE fonction que pour gouverner le geste de
 * commander (POST /api/parent/commandes, le formulaire lui-même) — voir
 * estMenuVisible ci-dessous pour l'AFFICHAGE du menu et du PDF, qui suit
 * une règle plus large et volontairement distincte depuis le 8 septembre
 * 2026 (Christine : « commande en ligne fermée, pdf accessible » — des
 * parents se réveillant en pleine semaine de service trouvaient la page du
 * menu entière introuvable, PDF compris, dès la date limite passée le
 * vendredi précédent). dateLimiteCommande est obligatoire à la création du
 * menu (voir schema.prisma) — jamais nulle ici. datePublication, elle, est
 * optionnelle : absente, elle ne bloque rien (comportement d'avant le
 * 16 août 2026) — un menu construit à l'avance mais qu'on veut ouvrir
 * uniquement à sa date réelle doit la renseigner explicitement.
 */
export function estActivementPublie(menu: { publie: boolean; dateLimiteCommande: Date; datePublication?: Date | null }): boolean {
  if (!menu.publie) return false;
  if (menu.datePublication && new Date() < menu.datePublication) return false;
  return new Date() <= finDeJournee(menu.dateLimiteCommande);
}

/**
 * Un menu est-il visible pour un parent (page du menu, PDF, liens
 * « Téléchargez le menu ») ? Contrairement à estActivementPublie, ceci ne
 * dépend PAS de la date limite de commande — seulement de la publication
 * et de la période de service (periodeFin) : le menu reste consultable et
 * téléchargeable jusqu'à la fin de la semaine où il est servi, même si les
 * commandes en ligne sont closes depuis le vendredi précédent. Au-delà de
 * periodeFin, le menu suivant a normalement déjà pris sa place dans les
 * listes (voir app/menus/page.tsx et app/menus/[institutionId]/page.tsx).
 */
export function estMenuVisible(menu: { publie: boolean; periodeFin: Date; datePublication?: Date | null }): boolean {
  if (!menu.publie) return false;
  if (menu.datePublication && new Date() < menu.datePublication) return false;
  return new Date() <= finDeJournee(menu.periodeFin);
}

/**
 * « Actif » dans l'admin (badge vert distinct du statut « ouvert pour
 * commander ») : ce menu est-il celui de la semaine de service EN COURS ?
 * Contrairement à estMenuVisible (qui reste vrai jusqu'à periodeFin peu
 * importe quand la semaine a commencé — utile pour la consultation tardive
 * par un parent), ceci vérifie aussi periodeDebut : un menu publié à
 * l'avance pour une semaine future n'est pas encore « actif », seulement
 * « ouvert pour commander » si sa date limite n'est pas encore passée.
 * Décidé avec Charles le 9 octobre 2026 — les deux statuts affichent
 * désormais deux indicateurs séparés dans /admin/menus plutôt qu'un seul.
 */
export function estSemaineServiceCourante(menu: { publie: boolean; periodeDebut: Date; periodeFin: Date }): boolean {
  if (!menu.publie) return false;
  const maintenant = new Date();
  return maintenant >= menu.periodeDebut && maintenant <= finDeJournee(menu.periodeFin);
}
