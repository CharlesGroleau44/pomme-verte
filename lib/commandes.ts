// lib/commandes.ts
// Logique de validation + écriture partagée entre la commande d'un
// parent connecté (POST /api/parent/commandes) et celle d'un invité
// (POST /api/parent/commandes-invite) — les deux aboutissent au même
// enregistrement Commande/LigneCommande, seule la façon d'obtenir
// enfantId diffère.
import { prisma } from '@/lib/prisma';
import { estActivementPublie } from '@/lib/menu-logic';

// FONDATION n'est valide que pour les institutions qui l'offrent — voir la
// vérification institution.offreFondation dans chargerEtValiderMenu.
export const MODES_PAIEMENT_VALIDES = ['ARGENT', 'VIREMENT_INTERAC', 'CHEQUE', 'PREPAYE', 'FONDATION'];
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

/** Vérifie que le menu accepte les commandes et que chaque ligne pointe vraiment vers ce menu. */
export async function chargerEtValiderMenu(menuId: string, enfantInstitutionId: string, lignes: LigneEntree[], modePaiement?: string) {
  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    include: { journees: { include: { selections: true } }, institution: true },
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
  const journeesParId = new Map(menu.journees.map((j) => [j.id, j]));
  for (const l of lignes) {
    const journee = journeesParId.get(l.journeeId);
    if (!journee || !journee.selections.some((s) => s.id === l.selectionId)) {
      throw new ErreurCommande('Sélection de journée invalide pour ce menu.');
    }
  }
  return menu;
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
  return prisma.$transaction(async (tx) => {
    const c = await tx.commande.upsert({
      where: { enfantId_menuId: { enfantId, menuId } },
      update: { modePaiement: modePaiement as never },
      create: { compteParentId, enfantId, menuId, modePaiement: modePaiement as never },
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
