// lib/rapports.ts
// Agrégations partagées par le tableau de bord et les 6 rapports PDF
// (voir app/admin/dashboard/). Un seul point de calcul, réutilisé partout,
// pour ne jamais dupliquer la résolution de prix (voir prixSelonTaille dans
// lib/menu-logic.ts) ni les soldes (lib/entente.ts, lib/solde-prepaye.ts) —
// même principe que le reste de la base : la vérité vient toujours des
// enregistrements réels (LigneCommande, DepotPrepaye…), jamais d'un total
// stocké qui pourrait dériver.
import { prisma } from './prisma';
import { prixLigne, resoudreSelection, selectionVersTexte } from './menu-logic';
import { soldeEntente, etatVersement } from './entente';
import { soldePrepaye } from './solde-prepaye';

export type FiltresRapport = {
  dateDebut?: string | null; // AAAA-MM-JJ — journee.date >= dateDebut
  dateFin?: string | null;   // AAAA-MM-JJ — journee.date <= dateFin
  institutionId?: string | null;
  modePaiement?: string | null;
  payeSeulement?: boolean | null; // true=payé seulement, false=non payé seulement, absent=les deux
};

/**
 * Remet dateDebut/dateFin dans le bon ordre si une saisie (ou une URL de
 * rapport modifiée à la main) les a inversées — plutôt que de renvoyer
 * silencieusement un rapport vide avec un texte de période absurde
 * (« Du 30 août au 1er août »). Comparaison lexicographique valide car les
 * dates sont en AAAA-MM-JJ (zéro-paddées).
 */
export function normaliserPeriode<T extends { dateDebut?: string | null; dateFin?: string | null }>(filtres: T): T {
  if (filtres.dateDebut && filtres.dateFin && filtres.dateDebut > filtres.dateFin) {
    return { ...filtres, dateDebut: filtres.dateFin, dateFin: filtres.dateDebut };
  }
  return filtres;
}

export type LigneResolue = {
  id: string;
  date: Date;
  prix: number;
  nom: string;
  taille: string;
  tardive: boolean;
  institutionId: string;
  institutionNom: string;
  modePaiement: string;
  paye: boolean;
  commandeId: string;
  enfantId: string;
  enfantNom: string;
  compteParentId: string;
};

/**
 * Charge toutes les lignes de commande dans la fenêtre demandée, avec le
 * prix et le nom déjà résolus (override ?? repas maître — même résolution
 * que /api/commandes). C'est la matière première de tous les rapports
 * financiers : chacun regroupe ensuite ces lignes différemment (par mode de
 * paiement, par école, par mois…) plutôt que de refaire la requête.
 */
export async function chargerLignesResolues(filtresBruts: FiltresRapport): Promise<LigneResolue[]> {
  const filtres = normaliserPeriode(filtresBruts);
  const where: Record<string, unknown> = {};
  if (filtres.dateDebut || filtres.dateFin) {
    where.journee = {
      date: {
        ...(filtres.dateDebut ? { gte: new Date(`${filtres.dateDebut}T00:00:00Z`) } : {}),
        ...(filtres.dateFin ? { lte: new Date(`${filtres.dateFin}T23:59:59Z`) } : {}),
      },
    };
  }
  const commandeWhere: Record<string, unknown> = {};
  if (filtres.modePaiement) commandeWhere.modePaiement = filtres.modePaiement;
  if (filtres.payeSeulement === true) commandeWhere.paye = true;
  if (filtres.payeSeulement === false) commandeWhere.paye = false;
  if (filtres.institutionId) commandeWhere.enfant = { institutionId: filtres.institutionId };
  if (Object.keys(commandeWhere).length > 0) where.commande = commandeWhere;

  const lignes = await prisma.ligneCommande.findMany({
    where,
    include: {
      journee: true,
      selection: { include: { repas: true } },
      commande: {
        include: {
          enfant: { include: { institution: true } },
        },
      },
    },
  });

  return lignes.map((l) => ({
    id: l.id,
    date: l.journee.date,
    prix: prixLigne(l, selectionVersTexte(l.selection)),
    nom: resoudreSelection(selectionVersTexte(l.selection)).nom,
    taille: l.taille,
    tardive: l.tardive,
    institutionId: l.commande.enfant.institutionId,
    institutionNom: l.commande.enfant.institution.nom,
    modePaiement: l.commande.modePaiement,
    paye: l.commande.paye,
    commandeId: l.commandeId,
    enfantId: l.commande.enfantId,
    enfantNom: `${l.commande.enfant.prenom} ${l.commande.enfant.nomDeFamille}`,
    compteParentId: l.commande.compteParentId,
  }));
}

export function totauxLignes(lignes: LigneResolue[]) {
  const commandesDistinctes = new Set(lignes.map((l) => l.commandeId)).size;
  const revenu = lignes.reduce((s, l) => s + l.prix, 0);
  const nonPaye = lignes.filter((l) => !l.paye).reduce((s, l) => s + l.prix, 0);
  return { repas: lignes.length, commandes: commandesDistinctes, revenu, nonPaye };
}

export function ventilationParModePaiement(lignes: LigneResolue[]) {
  const parMode = new Map<string, { modePaiement: string; repas: number; revenu: number }>();
  for (const l of lignes) {
    const e = parMode.get(l.modePaiement) ?? { modePaiement: l.modePaiement, repas: 0, revenu: 0 };
    e.repas += 1;
    e.revenu += l.prix;
    parMode.set(l.modePaiement, e);
  }
  return Array.from(parMode.values()).sort((a, b) => b.revenu - a.revenu);
}

export function ventilationParInstitution(lignes: LigneResolue[]) {
  const parEcole = new Map<string, { institutionId: string; institutionNom: string; commandes: Set<string>; repas: number; revenu: number; nonPaye: number }>();
  for (const l of lignes) {
    const e = parEcole.get(l.institutionId) ?? { institutionId: l.institutionId, institutionNom: l.institutionNom, commandes: new Set(), repas: 0, revenu: 0, nonPaye: 0 };
    e.commandes.add(l.commandeId);
    e.repas += 1;
    e.revenu += l.prix;
    if (!l.paye) e.nonPaye += l.prix;
    parEcole.set(l.institutionId, e);
  }
  return Array.from(parEcole.values())
    .map((e) => ({ institutionId: e.institutionId, institutionNom: e.institutionNom, commandes: e.commandes.size, repas: e.repas, revenu: e.revenu, nonPaye: e.nonPaye }))
    .sort((a, b) => b.revenu - a.revenu);
}

/** Regroupe par mois calendaire (AAAA-MM), triés chronologiquement. */
export function ventilationParMois(lignes: LigneResolue[]) {
  const parMois = new Map<string, { mois: string; commandes: Set<string>; repas: number; revenu: number }>();
  for (const l of lignes) {
    const cle = l.date.toISOString().slice(0, 7);
    const e = parMois.get(cle) ?? { mois: cle, commandes: new Set(), repas: 0, revenu: 0 };
    e.commandes.add(l.commandeId);
    e.repas += 1;
    e.revenu += l.prix;
    parMois.set(cle, e);
  }
  return Array.from(parMois.values())
    .map((e) => ({ mois: e.mois, commandes: e.commandes.size, repas: e.repas, revenu: e.revenu }))
    .sort((a, b) => a.mois.localeCompare(b.mois));
}

/** Période de même longueur immédiatement avant [dateDebut, dateFin] — pour la comparaison du sommaire financier. */
export function periodePrecedente(dateDebut: string, dateFin: string): { dateDebut: string; dateFin: string } {
  const debut = new Date(`${dateDebut}T00:00:00Z`);
  const fin = new Date(`${dateFin}T00:00:00Z`);
  const dureeMs = fin.getTime() - debut.getTime();
  const finPrecedente = new Date(debut.getTime() - 86_400_000);
  const debutPrecedente = new Date(finPrecedente.getTime() - dureeMs);
  return { dateDebut: debutPrecedente.toISOString().slice(0, 10), dateFin: finPrecedente.toISOString().slice(0, 10) };
}

export type EntenteRapport = {
  enfantId: string;
  enfantNom: string;
  institutionNom: string;
  niveau: string;
  versements: number | null;
  montantTotal: number;
  repasInclus: number;
  repasUtilises: number;
  repasRestants: number;
  soldeDollars: number;
  versement2: ReturnType<typeof etatVersement>;
};

/** État courant (« aujourd'hui ») de toutes les ententes annuelles actives — pas de fenêtre de dates, c'est un solde vivant. */
export async function chargerEntentesAnnuelles(institutionId?: string | null): Promise<EntenteRapport[]> {
  const enfants = await prisma.enfant.findMany({
    where: { prepayeAnnuel: true, ...(institutionId ? { institutionId } : {}) },
    include: { institution: true },
    orderBy: [{ institution: { nom: 'asc' } }, { nomDeFamille: 'asc' }],
  });
  return Promise.all(
    enfants.map(async (e) => {
      const solde = await soldeEntente(e.id);
      return {
        enfantId: e.id,
        enfantNom: `${e.prenom} ${e.nomDeFamille}`,
        institutionNom: e.institution.nom,
        niveau: e.niveau,
        versements: e.ententeVersements,
        montantTotal: solde.montantTotal,
        repasInclus: solde.repasInclus,
        repasUtilises: solde.repasUtilises,
        repasRestants: solde.repasRestants,
        soldeDollars: solde.soldeDollars,
        versement2: etatVersement(e.ententeDate2eVersement, e.ententeVerse2Paye),
      };
    })
  );
}

export type SoldePrepayeRapport = {
  compteParentId: string;
  nom: string;
  courriel: string;
  institutions: string[];
  totalDepose: number;
  consomme: number;
  disponible: number;
};

/** État courant de tous les soldes prépayés (libres) actifs — même logique : solde vivant, pas de fenêtre de dates. */
export async function chargerSoldesPrepayes(institutionId?: string | null): Promise<SoldePrepayeRapport[]> {
  const parents = await prisma.compteParent.findMany({
    where: {
      soldePrepayeActif: true,
      ...(institutionId ? { enfants: { some: { institutionId } } } : {}),
    },
    include: { enfants: { include: { institution: true } } },
    orderBy: { nom: 'asc' },
  });
  return Promise.all(
    parents.map(async (p) => {
      const solde = await soldePrepaye(p.id);
      const institutions = Array.from(new Set(p.enfants.map((e) => e.institution.nom)));
      return {
        compteParentId: p.id,
        nom: p.nom,
        courriel: p.courriel,
        institutions,
        totalDepose: solde.totalDepose,
        consomme: solde.consomme,
        disponible: solde.disponible,
      };
    })
  );
}

export type FrequentationInstitution = {
  institutionId: string;
  institutionNom: string;
  totalEnfants: number;
  enfantsActifs: number; // au moins 1 commande dans la fenêtre
  parNiveau: { niveau: string; total: number; actifs: number }[];
};

/**
 * Taux de participation aux commandes, par école et par niveau, pour une
 * fenêtre de dates donnée — basé sur les comptes parents réels (Enfant),
 * pas sur le registre officiel de l'école (EleveRegistre) : les deux listes
 * ne sont pas reliées entre elles (un élève du registre peut n'avoir aucun
 * compte parent chez nous — voir prisma/schema.prisma), un rapprochement par
 * nom serait approximatif. Ce rapport mesure donc « parmi nos familles
 * inscrites à cette école, combien ont commandé au moins une fois ».
 */
export async function chargerFrequentation(filtresBruts: FiltresRapport): Promise<FrequentationInstitution[]> {
  const filtres = normaliserPeriode(filtresBruts);
  const enfants = await prisma.enfant.findMany({
    where: {
      ...(filtres.institutionId ? { institutionId: filtres.institutionId } : {}),
      // Exclut les familles inscrites APRÈS la fin de la période demandée :
      // sans ça, un enfant ajouté le 25 août gonflerait le dénominateur d'un
      // rapport filtré sur juillet alors qu'il n'existait pas encore et
      // n'avait donc aucune chance d'avoir commandé — le taux de
      // participation paraîtrait faussement bas.
      ...(filtres.dateFin ? { createdAt: { lte: new Date(`${filtres.dateFin}T23:59:59Z`) } } : {}),
    },
    include: { institution: true },
  });

  const lignes = await chargerLignesResolues({ dateDebut: filtres.dateDebut, dateFin: filtres.dateFin, institutionId: filtres.institutionId });
  const enfantsActifs = new Set(lignes.map((l) => l.enfantId));

  const parEcole = new Map<string, FrequentationInstitution>();
  for (const e of enfants) {
    const cle = e.institutionId;
    if (!parEcole.has(cle)) {
      parEcole.set(cle, { institutionId: cle, institutionNom: e.institution.nom, totalEnfants: 0, enfantsActifs: 0, parNiveau: [] });
    }
    const ecole = parEcole.get(cle)!;
    ecole.totalEnfants += 1;
    const actif = enfantsActifs.has(e.id);
    if (actif) ecole.enfantsActifs += 1;

    let niveauEntry = ecole.parNiveau.find((n) => n.niveau === e.niveau);
    if (!niveauEntry) {
      niveauEntry = { niveau: e.niveau, total: 0, actifs: 0 };
      ecole.parNiveau.push(niveauEntry);
    }
    niveauEntry.total += 1;
    if (actif) niveauEntry.actifs += 1;
  }

  return Array.from(parEcole.values())
    .map((e) => ({ ...e, parNiveau: e.parNiveau.sort((a, b) => a.niveau.localeCompare(b.niveau)) }))
    .sort((a, b) => a.institutionNom.localeCompare(b.institutionNom));
}
