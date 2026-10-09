// lib/solde-prepaye.ts
// Solde prépayé libre : un parent avance un montant de son choix (voir
// Christine, courriel du 10 août 2026 — « le parent qui voudrait donner un
// montant X pourrait aussi », approuvé le 11 août pour des paliers alignés
// sur un nombre de repas) plutôt que le forfait complet de l'entente
// annuelle (lib/entente.ts). Contrairement à l'entente, qui est à taux fixe
// 6,50$/repas, ce solde se débite au PRIX RÉEL de chaque ligne de commande
// (Petit / Régulier / Portion+) — Christine n'a jamais mentionné de rabais
// pour ce mode, seulement une avance de fonds.
//
// Le solde n'est JAMAIS stocké comme compteur mutable : il se calcule en
// sommant les dépôts (DepotPrepaye) moins le coût des lignes déjà envoyées
// en SOLDE_PREPAYE. Même principe que l'entente annuelle — la vérité vient
// toujours des enregistrements réels, jamais d'un compteur qui pourrait
// dériver à la première modification ou annulation de commande.
import { prisma } from './prisma';
import { prixLigne, selectionVersTexte } from './menu-logic';

// Paliers suggérés à l'écran admin — alignés sur un nombre de repas au
// tarif régulier de 7$ (10, 20, 30, 40 repas). Christine a approuvé cette
// option plutôt que des montants arbitraires (50-100-200-300-400$), qui
// laissent un reliquat fractionnaire. Ce sont des suggestions, pas une
// contrainte : un autre montant reste toujours saisissable.
export const PALIERS_DEPOT = [70, 140, 210, 280];

type LigneAvecPrix = {
  taille: string;
  prixOverride?: unknown;
  selection: Parameters<typeof selectionVersTexte>[0];
};

function coutTotal(lignes: LigneAvecPrix[]): number {
  return lignes.reduce((total, l) => total + prixLigne(l, selectionVersTexte(l.selection)), 0);
}

async function coutConsomme(compteParentId: string): Promise<number> {
  const lignes = await prisma.ligneCommande.findMany({
    where: { commande: { compteParentId, modePaiement: 'SOLDE_PREPAYE' } },
    include: { selection: { include: { repas: true } } },
  });
  return coutTotal(lignes);
}

export async function soldePrepaye(compteParentId: string) {
  const [depots, consomme] = await Promise.all([
    prisma.depotPrepaye.findMany({ where: { compteParentId }, orderBy: { createdAt: 'desc' } }),
    coutConsomme(compteParentId),
  ]);
  const totalDepose = depots.reduce((s, d) => s + parseFloat(d.montant.toString()), 0);
  return {
    totalDepose,
    consomme,
    disponible: Math.max(0, totalDepose - consomme),
    depots: depots.map((d) => ({ id: d.id, montant: parseFloat(d.montant.toString()), motif: d.motif, createdAt: d.createdAt })),
  };
}

/**
 * Budget réellement disponible pour ENREGISTRER une commande (enfant, menu)
 * donnée — additionne au solde courant ce que cette même commande
 * consommait déjà, puisque enregistrerCommande() remplace ses lignes en
 * entier plutôt que de les additionner. Sans ce rajout, modifier une
 * commande déjà payée par le solde grugerait deux fois le même montant.
 */
export async function budgetDisponiblePour(compteParentId: string, enfantId: string, menuId: string): Promise<number> {
  const [{ disponible }, commandeExistante] = await Promise.all([
    soldePrepaye(compteParentId),
    prisma.commande.findUnique({
      where: { enfantId_menuId: { enfantId, menuId } },
      include: { lignes: { include: { selection: { include: { repas: true } } } } },
    }),
  ]);
  const coutRemplace = commandeExistante?.modePaiement === 'SOLDE_PREPAYE' ? coutTotal(commandeExistante.lignes) : 0;
  return disponible + coutRemplace;
}
