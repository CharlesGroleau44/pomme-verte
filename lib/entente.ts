// lib/entente.ts
// L'entente annuelle de Christine (courriels des 10-11 août 2026) : un
// forfait de 1 170 $ pour l'année scolaire, qui revient à 6,50 $/repas sur
// 180 repas — 1 170 / 6,50 = 180, soit l'année scolaire complète. Payable
// en 1 ou 2 versements ; le 2e, en janvier au plus tard.
//
// PAR ENFANT depuis le 17 août 2026 (Christine, en réponse à « un parent
// avec 2 enfants, est-ce que le prix ajuste? ») : chaque enfant a son
// propre forfait de 180 repas — un bassin partagé aurait vidé deux fois
// plus vite pour une famille à deux enfants, au même prix qu'une famille
// à un seul. Le parent garde néanmoins UN SEUL compte/connexion — voir
// Enfant.prepayeAnnuel dans prisma/schema.prisma, pas CompteParent.
//
// Le solde restant n'est JAMAIS stocké : il se calcule en comptant les
// lignes de commande de CET enfant déjà envoyées en PREPAYE. La vérité
// vient toujours des commandes elles-mêmes — un compteur à part se
// désynchroniserait à la première modification ou annulation.
import { prisma } from './prisma';

export const MONTANT_ENTENTE = 1170;
export const TARIF_ENTENTE = 6.5;
export const REPAS_INCLUS = Math.round(MONTANT_ENTENTE / TARIF_ENTENTE); // 180
export const MONTANT_VERSEMENT = MONTANT_ENTENTE / 2; // 585 — si 2 versements

export async function soldeEntente(enfantId: string) {
  const repasUtilises = await prisma.ligneCommande.count({
    where: { commande: { enfantId, modePaiement: 'PREPAYE' } },
  });
  return {
    montantTotal: MONTANT_ENTENTE,
    montantVersement: MONTANT_VERSEMENT,
    repasInclus: REPAS_INCLUS,
    repasUtilises,
    repasRestants: Math.max(0, REPAS_INCLUS - repasUtilises),
    soldeDollars: Math.max(0, MONTANT_ENTENTE - repasUtilises * TARIF_ENTENTE),
  };
}

/** Jours entre deux dates (positif = a est dans le futur par rapport à b). */
function joursEntre(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

/**
 * État du 2e versement pour l'affichage (compte parent) — distinct de la
 * décision d'envoyer un rappel courriel (voir /api/taches/rappel-versement-entente),
 * qui a sa propre fenêtre pour éviter de spammer.
 */
export function etatVersement(dateEcheance: Date | null, verse2Paye: boolean, aujourdhui = new Date()) {
  if (!dateEcheance || verse2Paye) return null;
  const jours = joursEntre(dateEcheance, aujourdhui);
  return {
    montant: MONTANT_VERSEMENT,
    dateEcheance,
    joursRestants: jours,
    enRetard: jours < 0,
    // Averti dès 14 jours avant l'échéance, comme le rappel de date limite
    // de commande (voir lib/menu-logic.ts) — même logique de préavis.
    approche: jours <= 14,
  };
}
