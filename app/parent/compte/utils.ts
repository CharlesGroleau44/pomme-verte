// app/parent/compte/utils.ts
// Calcul du prix d'une ligne/commande — l'API parent (contrairement à
// /api/commandes côté admin) retourne les champs bruts de LigneCommande,
// pas de nomResolu/prixResolu déjà calculés. On réutilise resoudreSelection
// (la même logique que le montage de menu) plutôt que de la dupliquer.
import { resoudreSelection, prixLigne } from '@/lib/menu-logic';
import type { Commande, Ligne } from './ContexteParent';

export function resoudreLigne(ligne: Ligne) {
  const r = resoudreSelection(ligne.selection);
  return { nom: r.nom, prix: prixLigne(ligne, ligne.selection) };
}

export function totalCommande(commande: Commande): number {
  return commande.lignes.reduce((s, l) => s + resoudreLigne(l).prix, 0);
}

export const LABEL_TAILLE: Record<string, string> = {
  PETIT: 'Petit repas',
  REGULIER: 'Repas régulier',
  DEUXIEME_SERVICE: 'Portion +',
};

export const LABEL_PAIEMENT: Record<string, string> = {
  ARGENT: 'Argent comptant',
  VIREMENT_INTERAC: 'Virement Interac',
  CHEQUE: 'Chèque',
  PAYPAL: 'Paypal',
  PREPAYE: 'Entente annuelle',
  SOLDE_PREPAYE: 'Solde prépayé',
  FONDATION: 'Fondation',
};
