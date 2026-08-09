// app/parent/compte/utils.ts
// Calcul du prix d'une ligne/commande — l'API parent (contrairement à
// /api/commandes côté admin) retourne les champs bruts de LigneCommande,
// pas de nomResolu/prixResolu déjà calculés. On réutilise resoudreSelection
// (la même logique que le montage de menu) plutôt que de la dupliquer.
import { resoudreSelection } from '@/lib/menu-logic';
import type { Commande, Ligne } from './ContexteParent';

export function resoudreLigne(ligne: Ligne) {
  const r = resoudreSelection(ligne.selection);
  const prix =
    ligne.taille === 'PETIT' ? r.prixPetit : ligne.taille === 'DEUXIEME_SERVICE' ? r.prixDeuxiemeService : r.prixRegulier;
  return { nom: r.nom, prix: parseFloat(prix) };
}

export function totalCommande(commande: Commande): number {
  return commande.lignes.reduce((s, l) => s + resoudreLigne(l).prix, 0);
}

export const LABEL_TAILLE: Record<string, string> = {
  PETIT: 'Petit repas',
  REGULIER: 'Repas régulier',
  DEUXIEME_SERVICE: '+ 2ᵉ service',
};

export const LABEL_PAIEMENT: Record<string, string> = {
  ARGENT: 'Argent comptant',
  VIREMENT_INTERAC: 'Virement Interac',
  CHEQUE: 'Chèque',
  PAYPAL: 'Paypal',
  PREPAYE: 'Prépayé',
  FONDATION: 'Fondation',
};
