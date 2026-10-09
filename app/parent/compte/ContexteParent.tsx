'use client';
// app/parent/compte/ContexteParent.tsx
// Contexte partagé par toutes les pages sous /parent/compte — un seul
// fetch de /api/parent/moi (+ /api/parent/institutions) fait dans le
// layout, consommé ici par chaque page via useParentCompte() pour éviter
// de dupliquer l'appel réseau et la redirection 401 sur chaque onglet.
import { createContext, useContext } from 'react';

export type Institution = { id: string; nom: string; logoUrl: string | null };
// Détail du 2e versement — null si versement unique, déjà réglé, ou pas
// d'échéance fixée. Voir lib/entente.ts (etatVersement) côté serveur.
export type EtatVersement = {
  montant: number;
  dateEcheance: string;
  joursRestants: number;
  enRetard: boolean;
  approche: boolean;
};
export type Entente = {
  montantTotal: number;
  montantVersement: number;
  repasInclus: number;
  repasUtilises: number;
  repasRestants: number;
  soldeDollars: number;
  versements: number | null;
  versement2: EtatVersement | null;
};
// Entente annuelle PAR ENFANT depuis le 17 août 2026 (voir lib/entente.ts) —
// chaque enfant porte son propre forfait/solde, le parent reste sur un
// seul compte.
export type Enfant = {
  id: string;
  nomDeFamille: string;
  prenom: string;
  niveau: string;
  intolerances: string[];
  autreIntolerance: string | null;
  institution: Institution;
  prepayeAnnuel: boolean;
  entente: Entente | null;
};
// Solde prépayé libre — distinct de l'entente annuelle (montant arbitraire,
// pas de taux fixe), partagé entre tous les enfants du compte. Voir
// lib/solde-prepaye.ts.
export type Depot = { id: string; montant: number; createdAt: string };
export type SoldePrepaye = {
  totalDepose: number;
  consomme: number;
  disponible: number;
  depots: Depot[];
};
export type Parent = {
  id: string;
  courriel: string;
  nom: string;
  telephone: string | null;
  soldePrepayeActif: boolean;
  modePaiementPrefere: string | null;
  soldePrepaye: SoldePrepaye | null;
  enfants: Enfant[];
};
export type Ligne = {
  id: string;
  taille: string;
  tardive: boolean;
  prixOverride: string | null;
  journeeId: string;
  selectionId: string;
  journee: { id: string; date: string; jourSemaine: string };
  selection: {
    nomOverride: string | null;
    descriptionOverride: string | null;
    photoUrlOverride: string | null;
    prixPetitOverride: string | null;
    prixRegulierOverride: string | null;
    prixDeuxiemeServiceOverride: string | null;
    repas: { nom: string; description: string | null; photoUrl: string | null; prixPetit: string; prixRegulier: string; prixDeuxiemeService: string };
  };
};
export type Commande = {
  id: string;
  createdAt: string;
  modePaiement: string;
  paye: boolean;
  payeLe: string | null;
  enfant: { id: string; prenom: string; nomDeFamille: string };
  menu: { id: string; thematiqueRef: { nom: string } | null; institution: Institution };
  lignes: Ligne[];
};

type ContexteParentValeur = {
  parent: Parent;
  institutions: Institution[];
  commandes: Commande[];
  recharger: () => Promise<void>;
};

export const ContexteParent = createContext<ContexteParentValeur | null>(null);

export function useParentCompte() {
  const ctx = useContext(ContexteParent);
  if (!ctx) throw new Error('useParentCompte() doit être utilisé sous /parent/compte/layout.tsx');
  return ctx;
}
