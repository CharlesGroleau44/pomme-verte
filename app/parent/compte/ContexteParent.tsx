'use client';
// app/parent/compte/ContexteParent.tsx
// Contexte partagé par toutes les pages sous /parent/compte — un seul
// fetch de /api/parent/moi (+ /api/parent/institutions) fait dans le
// layout, consommé ici par chaque page via useParentCompte() pour éviter
// de dupliquer l'appel réseau et la redirection 401 sur chaque onglet.
import { createContext, useContext } from 'react';

export type Institution = { id: string; nom: string; logoUrl: string | null };
export type Enfant = {
  id: string;
  nomDeFamille: string;
  prenom: string;
  niveau: string;
  intolerances: string[];
  autreIntolerance: string | null;
  institution: Institution;
};
export type Parent = {
  id: string;
  courriel: string;
  nom: string;
  telephone: string | null;
  prepayeAnnuel: boolean;
  modePaiementPrefere: string | null;
  enfants: Enfant[];
};
export type Ligne = {
  id: string;
  taille: string;
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
  menu: { id: string; thematique: string | null; institution: Institution };
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
