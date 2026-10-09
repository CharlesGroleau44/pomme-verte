// lib/commandes.ts
// Logique de validation + écriture d'une commande (POST
// /api/parent/commandes), réservée aux parents connectés — voir
// FormulaireCommande.tsx.
import { prisma } from '@/lib/prisma';
import { estActivementPublie, estJourAVenirOuAujourdhui, estMenuVisible, prixSelonTaille, selectionVersTexte } from '@/lib/menu-logic';

// FONDATION n'est valide que pour les institutions qui l'offrent — voir la
// vérification institution.offreFondation dans chargerEtValiderMenu.
// SOLDE_PREPAYE est universel (aucune restriction par institution — voir
// lib/solde-prepaye.ts), contrairement à FONDATION.
export const MODES_PAIEMENT_VALIDES = ['ARGENT', 'VIREMENT_INTERAC', 'CHEQUE', 'PREPAYE', 'SOLDE_PREPAYE', 'FONDATION'];
export const TAILLES_VALIDES = ['PETIT', 'REGULIER', 'DEUXIEME_SERVICE'];
export const NIVEAUX_VALIDES = ['Préscolaire', '1', '2', '3', '4', '5', '6', 'Adulte'];
export const INTOLERANCES_VALIDES = ['Gluten', 'Lactose', 'Végétarien'];

export type LigneEntree = { journeeId: string; selectionId: string; taille: string };

export class ErreurCommande extends Error {
  statut: number;
  constructor(message: string, statut = 400) {
    super(message);
    this.statut = statut;
  }
}

export function validerLignes(lignes: unknown): LigneEntree[] {
  if (!Array.isArray(lignes) || lignes.length === 0) {
    throw new ErreurCommande('Choisissez au moins une journée.');
  }
  for (const l of lignes) {
    if (typeof l.journeeId !== 'string' || typeof l.selectionId !== 'string' || !TAILLES_VALIDES.includes(l.taille)) {
      throw new ErreurCommande('Sélection de journée invalide.');
    }
  }
  return lignes;
}

/**
 * Vérifie que le menu accepte les commandes et que chaque ligne pointe
 * vraiment vers ce menu. Retourne aussi le coût total des lignes, calculé
 * au passage (les sélections sont déjà chargées ici) pour que l'appelant
 * n'ait pas à refaire une requête — utilisé par la vérification du solde
 * prépayé, voir POST /api/parent/commandes.
 */
export async function chargerEtValiderMenu(
  menuId: string,
  enfantInstitutionId: string,
  lignes: LigneEntree[],
  modePaiement?: string,
  enfantNiveau?: string
) {
  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    include: { journees: { include: { selections: { include: { repas: true } } } }, institution: true },
  });
  if (!menu || !estActivementPublie(menu)) {
    throw new ErreurCommande('Ce menu n\'est pas ouvert aux commandes.', 404);
  }
  if (menu.institutionId !== enfantInstitutionId) {
    throw new ErreurCommande('Ce menu ne correspond pas à l\'institution de cet enfant.');
  }
  if (modePaiement === 'FONDATION' && !menu.institution.offreFondation) {
    throw new ErreurCommande('Le mode de paiement "Fondation" n\'est pas offert pour cette institution.');
  }
  // Format « Petit repas » — certaines écoles le réservent à un
  // sous-ensemble de niveaux (ex. maternelle seulement — Christine,
  // courriels du 22 et 24 août 2026 : des 3e année commandaient à 6,50 $
  // alors que le format leur était réservé aux maternelles). Vide =
  // tous les niveaux admissibles quand l'institution l'offre.
  const { offreFormatPetit, niveauxFormatPetit } = menu.institution;
  const petitAutorise = offreFormatPetit && (niveauxFormatPetit.length === 0 || (!!enfantNiveau && niveauxFormatPetit.includes(enfantNiveau)));
  if (lignes.some((l) => l.taille === 'PETIT') && !petitAutorise) {
    throw new ErreurCommande('Le format "Petit repas" n\'est pas offert pour cet enfant à cette institution.');
  }
  const journeesParId = new Map(menu.journees.map((j) => [j.id, j]));
  let coutLignes = 0;
  for (const l of lignes) {
    const journee = journeesParId.get(l.journeeId);
    const selection = journee?.selections.find((s) => s.id === l.selectionId);
    if (!selection) {
      throw new ErreurCommande('Sélection de journée invalide pour ce menu.');
    }
    coutLignes += prixSelonTaille(l.taille, selectionVersTexte(selection));
  }
  return { menu, coutLignes };
}

/**
 * Commande tardive (dépannage) — après la date limite normale, tant que le
 * menu reste dans sa semaine de service (estMenuVisible). Chaque journée
 * choisie coûte le tarif dépannage FIXE de l'institution
 * (Institution.prixRepasDepannage), jamais le tarif du repas du jour — le
 * repas est « au choix du chef », aucune sélection n'est proposée au
 * parent (voir Christine, courriels des 8-9 septembre 2026). On prend donc
 * la première sélection définie ce jour-là comme simple valeur indicative
 * pour satisfaire la relation obligatoire de LigneCommande.
 */
export async function chargerEtValiderMenuTardif(
  menuId: string,
  enfantInstitutionId: string,
  journeeIds: string[],
  modePaiement?: string
) {
  if (!Array.isArray(journeeIds) || journeeIds.length === 0) {
    throw new ErreurCommande('Choisissez au moins une journée.');
  }
  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    include: { journees: { include: { selections: true } }, institution: true },
  });
  if (!menu || !estMenuVisible(menu)) {
    throw new ErreurCommande('Ce menu n\'est plus disponible.', 404);
  }
  if (estActivementPublie(menu)) {
    throw new ErreurCommande('Les commandes régulières sont encore ouvertes pour ce menu — utilisez le formulaire habituel.', 422);
  }
  if (menu.institutionId !== enfantInstitutionId) {
    throw new ErreurCommande('Ce menu ne correspond pas à l\'institution de cet enfant.');
  }
  if (modePaiement === 'FONDATION' && !menu.institution.offreFondation) {
    throw new ErreurCommande('Le mode de paiement "Fondation" n\'est pas offert pour cette institution.');
  }
  if (menu.institution.prixRepasDepannage == null) {
    throw new ErreurCommande('La commande tardive n\'est pas offerte pour cette institution.', 422);
  }
  const prixUnitaire = parseFloat(menu.institution.prixRepasDepannage.toString());

  const journeesParId = new Map(menu.journees.map((j) => [j.id, j]));
  const journeesChoisies: { id: string; selectionId: string }[] = [];
  for (const journeeId of new Set(journeeIds)) {
    const journee = journeesParId.get(journeeId);
    if (!journee) throw new ErreurCommande('Journée invalide pour ce menu.');
    if (!estJourAVenirOuAujourdhui(journee.date)) {
      throw new ErreurCommande('Impossible de commander tardivement pour une journée déjà passée.');
    }
    const premiereSelection = journee.selections[0];
    if (!premiereSelection) throw new ErreurCommande('Aucun repas défini pour cette journée.');
    journeesChoisies.push({ id: journee.id, selectionId: premiereSelection.id });
  }
  return { menu, journeesChoisies, prixUnitaire, coutLignes: prixUnitaire * journeesChoisies.length };
}

/**
 * Écrit une commande tardive — AJOUTE ou remplace les lignes des journées
 * demandées sur la commande existante de cet (enfant, menu) sans toucher
 * aux autres journées déjà commandées normalement (contrairement à
 * enregistrerCommande, qui remplace toutes les lignes d'un coup : ici, une
 * commande normale déjà envoyée pour d'autres jours de la même semaine ne
 * doit jamais disparaître). Le mode de paiement de la commande n'est
 * changé que s'il n'y avait pas encore de commande, ou pour forcer
 * PREPAYE/SOLDE_PREPAYE (jamais pour écraser un mode externe déjà choisi
 * par le parent pour les jours précédents).
 *
 * Correctif du 2026-09-24 (Christine) : si la commande existante était déjà
 * marquée payée (ex. virement Interac confirmé pour les jours réguliers) et
 * que l'ajout tardif se fait par un mode externe (donc pas encore reçu), la
 * commande ENTIÈRE redevient "non payée" — sinon la console affichait
 * « PAYÉ » en vert pour un montant qui inclut le nouveau repas jamais
 * encore reçu. PREPAYE/SOLDE_PREPAYE restent toujours payés immédiatement,
 * l'argent étant déjà sécurisé d'avance.
 */
export async function enregistrerCommandeTardive(params: {
  compteParentId: string;
  enfantId: string;
  menuId: string;
  modePaiement: string;
  journeesChoisies: { id: string; selectionId: string }[];
  prixUnitaire: number;
}) {
  const { compteParentId, enfantId, menuId, modePaiement, journeesChoisies, prixUnitaire } = params;
  const paiementDejaRecu = modePaiement === 'PREPAYE' || modePaiement === 'SOLDE_PREPAYE';
  return prisma.$transaction(async (tx) => {
    const existante = await tx.commande.findUnique({ where: { enfantId_menuId: { enfantId, menuId } } });
    const c = existante
      ? await tx.commande.update({
          where: { id: existante.id },
          data: {
            ...(paiementDejaRecu
              ? { modePaiement: modePaiement as never, paye: true, payeLe: new Date() }
              : { paye: false, payeLe: null }),
            avisEcoleEnvoyeLe: null,
          },
        })
      : await tx.commande.create({
          data: {
            compteParentId, enfantId, menuId, modePaiement: modePaiement as never,
            ...(paiementDejaRecu ? { paye: true, payeLe: new Date() } : {}),
          },
        });

    for (const j of journeesChoisies) {
      await tx.ligneCommande.upsert({
        where: { commandeId_journeeId: { commandeId: c.id, journeeId: j.id } },
        update: { selectionId: j.selectionId, taille: 'REGULIER', tardive: true, prixOverride: prixUnitaire },
        create: { commandeId: c.id, journeeId: j.id, selectionId: j.selectionId, taille: 'REGULIER', tardive: true, prixOverride: prixUnitaire },
      });
    }

    return tx.commande.findUniqueOrThrow({
      where: { id: c.id },
      include: { enfant: true, menu: true, lignes: { include: { journee: true, selection: { include: { repas: true } } } } },
    });
  });
}

/** Crée ou remplace la commande d'un enfant pour un menu — une seule commande par (enfant, menu), voir @@unique. */
export async function enregistrerCommande(params: {
  compteParentId: string;
  enfantId: string;
  menuId: string;
  modePaiement: string;
  lignes: LigneEntree[];
}) {
  const { compteParentId, enfantId, menuId, modePaiement, lignes } = params;
  // PREPAYE et SOLDE_PREPAYE : l'argent est déjà sécurisé AVANT la commande
  // (entente annuelle ou dépôt reçu d'avance) — contrairement à ARGENT /
  // VIREMENT_INTERAC / CHEQUE / FONDATION, il n'y a rien que Christine doive
  // confirmer avoir reçu après coup. Sans ce marquage, ces commandes
  // restaient « non payé » dans la console malgré un compte déjà réglé —
  // trouvé par Christine le 13 août 2026 (« j'aurais pensé que cela se
  // faisait seul »). On ne touche paye QUE pour ces deux modes : les autres
  // gardent leur statut existant (create → false par défaut, update → ce
  // que Christine a déjà coché à la main).
  const paiementDejaRecu = modePaiement === 'PREPAYE' || modePaiement === 'SOLDE_PREPAYE';
  return prisma.$transaction(async (tx) => {
    const c = await tx.commande.upsert({
      where: { enfantId_menuId: { enfantId, menuId } },
      update: {
        modePaiement: modePaiement as never,
        ...(paiementDejaRecu ? { paye: true, payeLe: new Date() } : {}),
        // Une commande déjà incluse dans un digest (voir
        // /api/taches/digest-commandes) redevient "en attente" dès qu'elle
        // est modifiée — sinon l'école ne verrait jamais le changement.
        avisEcoleEnvoyeLe: null,
      },
      create: {
        compteParentId, enfantId, menuId, modePaiement: modePaiement as never,
        ...(paiementDejaRecu ? { paye: true, payeLe: new Date() } : {}),
      },
    });
    await tx.ligneCommande.deleteMany({ where: { commandeId: c.id } });
    await tx.ligneCommande.createMany({
      data: lignes.map((l) => ({ commandeId: c.id, journeeId: l.journeeId, selectionId: l.selectionId, taille: l.taille as never })),
    });
    return tx.commande.findUniqueOrThrow({
      where: { id: c.id },
      include: { enfant: true, menu: true, lignes: { include: { journee: true, selection: { include: { repas: true } } } } },
    });
  });
}
