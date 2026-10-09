// lib/classeur-commandes.ts
// Le classeur de travail de Christine, produit directement — un menu = un
// fichier (donc une école et une période, puisqu'un menu appartient à une
// seule institution).
//
// POURQUOI CETTE FORME — Christine a envoyé le 12 août 2026 les trois
// fichiers de son ancienne chaîne de travail, qui se lisent en séquence :
//   1. l'export du fournisseur précédent : une ligne par commande, les
//      journées en colonnes avec le NOM du repas ;
//   2. son fichier de travail : elle remplaçait chaque nom par un code
//      (1 = menu du jour, 2 = 2e choix, 0 = rien) ;
//   3. la feuille cuisine : les élèves en ordre alphabétique « Nom, Prénom »,
//      une colonne par jour × (Menu 1 / Menu 2 / P), un 1 dans la bonne
//      case, et les totaux par jour en bas.
//
// Notre export CSV mettait les dix journées dans UNE seule cellule séparées
// par des « | » — d'où son « je ne peux pas diviser par catégorie ». Ce
// n'était pas un problème de mise en forme mais de structure : il n'y avait
// rien à trier ni à additionner.
//
// Le classeur produit ici saute les étapes 1 et 2 : la feuille Cuisine sort
// déjà dans la forme finale, et la feuille Détail porte ce qu'elle vérifiait
// à côté (niveau, allergies, paiement, total, parent).
//
// ÉCART ASSUMÉ avec son fichier : sa feuille listait les 288 élèves de
// l'école, y compris ceux qui ne commandent pas. Nous ne connaissons que les
// enfants ayant commandé — et seuls ceux-là se présentent au comptoir, donc
// la prise de présence fonctionne pareil sur une liste bien plus courte.
// Décision prise avec Charles le 12 août 2026.
import ExcelJS from 'exceljs';
import { prisma } from './prisma';
import { jourDuMoisUTC, prixLigne, selectionVersTexte } from './menu-logic';
import { cleEleve } from './normalisation';

const LABEL_PAIEMENT: Record<string, string> = {
  ARGENT: 'Argent comptant',
  VIREMENT_INTERAC: 'Virement Interac',
  CHEQUE: 'Chèque',
  PAYPAL: 'Paypal',
  PREPAYE: 'Entente annuelle',
  SOLDE_PREPAYE: 'Solde prépayé',
  FONDATION: 'Fondation',
};

// Vert de la marque, repris du système de design (tailwind.config.js).
const VERT = 'FF1B4A1E';
const VERT_PALE = 'FFF0F5E7';
// Rouge d'alerte pour les allergies — Christine les écrit en rouge à côté
// du nom sur ses listes papier (courriel du 13 août 2026, en réponse à
// l'écart signalé sur la feuille cuisine) ; c'est un rappel direct en
// cuisine, pas une donnée à retrouver dans un onglet séparé.
const ROUGE_ALLERGIE = 'FFB23A2E';
// Même couleurs que lib/registre-eleves.ts — mauve = entente annuelle,
// orange = Fondation, pour rester visuellement identique à l'export du
// registre et à son mémo papier « Présences & ventes ».
const MAUVE_ENTENTE = 'FFE6D6F0';
const ORANGE_FONDATION = 'FFFBE0B8';

// Lignes vierges laissées sous la liste, pour les élèves ou profs ajoutés
// le jour même par formulaire papier — Christine a précisé (13 août 2026)
// que la cuisine doit pouvoir les inscrire à la main, la liste n'étant
// jamais figée d'avance. Les totaux (COUNTA) couvrent aussi ces lignes :
// un ajout écrit à la main s'additionne automatiquement, sans recalcul.
const LIGNES_AJOUTS_DU_JOUR = 6;

/**
 * Construit le classeur d'un menu. Extrait de la route pour qu'un script de
 * vérification puisse produire exactement le même fichier hors HTTP — sans
 * quoi on ne peut contrôler le rendu qu'en étant connecté à la console.
 * Retourne null si le menu n'existe pas.
 */
export async function construireClasseurCommandes(
  menuId: string,
): Promise<{ buffer: ArrayBuffer; nomFichier: string } | null> {
  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    include: {
      institution: true,
      thematiqueRef: true,
      journees: {
        orderBy: { date: 'asc' },
        include: { selections: { orderBy: { createdAt: 'asc' }, include: { repas: true } } },
      },
    },
  });
  if (!menu) return null;

  const commandes = await prisma.commande.findMany({
    where: { menuId },
    include: {
      enfant: true,
      compteParent: true,
      lignes: { include: { journee: true, selection: { include: { repas: true } } } },
    },
  });

  // Ordre alphabétique « Nom, Prénom » — c'est l'ordre dans lequel le
  // comptoir cherche un enfant qui donne son nom. localeCompare gère les
  // accents (Élodie doit se classer avec les E, pas après Z).
  commandes.sort((a, b) => {
    const n = a.enfant.nomDeFamille.localeCompare(b.enfant.nomDeFamille, 'fr', { sensitivity: 'base' });
    return n !== 0 ? n : a.enfant.prenom.localeCompare(b.enfant.prenom, 'fr', { sensitivity: 'base' });
  });

  const journees = menu.journees;
  const classeur = new ExcelJS.Workbook();
  classeur.creator = 'Traiteur La Pomme Verte';

  const periode = `${fmt(menu.periodeDebut)} au ${fmt(menu.periodeFin)}`;
  const titre = `${menu.institution.nom} — ${menu.thematiqueRef?.nom ?? 'Menu'} — ${periode}`;

  // ------------------------------------------------------------------
  // Feuille 1 — CUISINE (la feuille du comptoir)
  // ------------------------------------------------------------------
  const cuisine = classeur.addWorksheet('Cuisine', {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 3 }], // le nom et les entêtes restent visibles
  });

  // 3 sous-colonnes par journée : Menu 1, Menu 2, P (Portion +) — décalées
  // d'une colonne par la colonne Niveau (voir ci-dessous).
  const COLS_PAR_JOUR = 3;
  const COL_JOURS_DEBUT = 3;
  cuisine.getCell(1, 1).value = titre;
  cuisine.getCell(1, 1).font = { bold: true, size: 13, color: { argb: VERT } };

  cuisine.getCell(2, 1).value = 'NOMS';
  journees.forEach((j, i) => {
    const c = COL_JOURS_DEBUT + i * COLS_PAR_JOUR;
    const cel = cuisine.getCell(2, c);
    cel.value = `${j.jourSemaine} ${jourDuMoisUTC(j.date.toISOString())}`;
    cuisine.mergeCells(2, c, 2, c + COLS_PAR_JOUR - 1);
    cel.alignment = { horizontal: 'center' };
    cel.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT } };

    ['Menu 1', 'Menu 2', 'P'].forEach((sous, k) => {
      const sc = cuisine.getCell(3, c + k);
      sc.value = sous;
      sc.font = { bold: true, size: 10 };
      sc.alignment = { horizontal: 'center' };
      sc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT_PALE } };
    });
  });
  cuisine.getCell(3, 1).value = 'Nom, Prénom';
  cuisine.getCell(3, 1).font = { bold: true, size: 10 };
  // Niveau en colonne 2 — demandé par Christine (courriel du 25 août 2026) :
  // elle imprime par service de dîner (ex. maternelle = 1er service, 1re-3e
  // = 2e, 4e-6e = 3e), un regroupement différent par école qu'elle fait
  // elle-même dans Excel une fois la colonne disponible.
  cuisine.getCell(3, 2).value = 'Niveau';
  cuisine.getCell(3, 2).font = { bold: true, size: 10 };
  cuisine.getCell(3, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT_PALE } };

  const derniereColonne = (COL_JOURS_DEBUT - 1) + journees.length * COLS_PAR_JOUR;

  // Registre officiel de l'école (voir EleveRegistre) — chargé AVANT la
  // boucle des commandes, pour que la couleur mauve/orange s'applique aux
  // DEUX cas, pas juste aux élèves du registre sans commande (voir plus
  // bas). Correctif du 7 septembre 2026 : un élève en entente annuelle
  // COMMANDE quand même chaque semaine (modePaiement PREPAYE, voir
  // lib/entente.ts) — sa ligne venait donc TOUJOURS de la boucle des
  // commandes réelles, qui n'appliquait jamais cette couleur. Résultat
  // signalé par Christine : « l'entente/Fondation ne se reproduit pas
  // nécessairement dans le fichier Excel » — en fait, elle ne s'appliquait
  // quasiment JAMAIS pour ces élèves-là, puisqu'ils commandent presque
  // toujours. cleEleve inclut le niveau (voir lib/normalisation.ts) pour ne
  // jamais confondre deux élèves homonymes de niveaux différents.
  const registre = await prisma.eleveRegistre.findMany({ where: { institutionId: menu.institutionId } });
  const registreParCle = new Map(registre.map((e) => [cleEleve(e.nom, e.prenom, e.niveau), e]));
  const fondCouleurRegistre = (nom: string, prenom: string, niveau: string): string | null => {
    const entree = registreParCle.get(cleEleve(nom, prenom, niveau));
    if (!entree) return null;
    return entree.ententeAnnuelle ? MAUVE_ENTENTE : entree.fondation ? ORANGE_FONDATION : null;
  };

  commandes.forEach((cmd, idx) => {
    const r = 4 + idx;
    const nomCel = cuisine.getCell(r, 1);
    const nomComplet = `${cmd.enfant.nomDeFamille}, ${cmd.enfant.prenom}`;
    const allergies = [...cmd.enfant.intolerances, cmd.enfant.autreIntolerance].filter(Boolean).join(', ');
    // Texte enrichi plutôt que deux cellules : le nom reste noir, l'allergie
    // s'ajoute en rouge gras juste à côté — exactement la mécanique papier
    // de Christine, pas une colonne de plus à consulter séparément.
    nomCel.value = allergies
      ? { richText: [
          { text: nomComplet, font: { bold: true } },
          { text: `  — ${allergies}`, font: { bold: true, color: { argb: ROUGE_ALLERGIE } } },
        ] }
      : nomComplet;
    cuisine.getCell(r, 2).value = cmd.enfant.niveau;
    cuisine.getCell(r, 2).alignment = { horizontal: 'center' };

    const fondCouleur = fondCouleurRegistre(cmd.enfant.nomDeFamille, cmd.enfant.prenom, cmd.enfant.niveau);
    if (fondCouleur) {
      for (let c = 1; c <= derniereColonne; c++) {
        cuisine.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fondCouleur } };
      }
    }

    for (const ligne of cmd.lignes) {
      const iJour = journees.findIndex((j) => j.id === ligne.journeeId);
      if (iJour < 0) continue;
      // « Menu 1 » = la 1re sélection de la journée, « Menu 2 » = la 2e.
      // C'est l'ordre d'ajout au montage du menu, le même que celui vu par
      // le parent — pas un classement arbitraire.
      const iSel = journees[iJour].selections.findIndex((s) => s.id === ligne.selectionId);
      const c = COL_JOURS_DEBUT + iJour * COLS_PAR_JOUR + Math.max(0, iSel);
      const cel = cuisine.getCell(r, c);
      cel.value = 1;
      cel.alignment = { horizontal: 'center' };
      if (ligne.taille === 'DEUXIEME_SERVICE') {
        const p = cuisine.getCell(r, COL_JOURS_DEBUT + iJour * COLS_PAR_JOUR + 2);
        p.value = 'P';
        p.alignment = { horizontal: 'center' };
        p.font = { bold: true };
      }
    }
  });

  // Élèves du registre qui n'ont PAS commandé en ligne pour ce menu — voir
  // courriel de Christine du 25 août 2026 : « une seule liste », le
  // registre fusionné à la feuille cuisine. Ajoutés SOUS les commandes
  // réelles, sans aucune case de journée remplie : la cuisine y écrit ses
  // codes 0/P/V/T à la main comme sur son ancienne feuille papier.
  // Institution sans registre importé = liste vide, comportement inchangé.
  const dejaCommande = new Set(commandes.map((c) => cleEleve(c.enfant.nomDeFamille, c.enfant.prenom, c.enfant.niveau)));
  const registreSeuls = registre
    .filter((e) => !dejaCommande.has(cleEleve(e.nom, e.prenom, e.niveau)))
    .sort((a, b) => {
      const n = a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
      return n !== 0 ? n : a.prenom.localeCompare(b.prenom, 'fr', { sensitivity: 'base' });
    });

  registreSeuls.forEach((e, idx) => {
    const r = 4 + commandes.length + idx;
    const nomCel = cuisine.getCell(r, 1);
    const nomComplet = `${e.nom}, ${e.prenom}`;
    nomCel.value = e.allergie
      ? { richText: [
          { text: nomComplet, font: { bold: true } },
          { text: `  — ${e.allergie}`, font: { bold: true, color: { argb: ROUGE_ALLERGIE } } },
        ] }
      : nomComplet;
    cuisine.getCell(r, 2).value = e.niveau;
    cuisine.getCell(r, 2).alignment = { horizontal: 'center' };

    const fondCouleur = e.ententeAnnuelle ? MAUVE_ENTENTE : e.fondation ? ORANGE_FONDATION : null;
    if (fondCouleur) {
      for (let c = 1; c <= derniereColonne; c++) {
        cuisine.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fondCouleur } };
      }
    }
  });

  // Lignes vierges pour les ajouts du jour — voir LIGNES_AJOUTS_DU_JOUR.
  // Une bordure pointillée sur chaque case marque clairement où écrire à
  // la main, sans imposer de nom de colonne que la cuisine devrait déduire.
  const rEtiquetteAjout = 4 + commandes.length + registreSeuls.length;
  const cLabel = cuisine.getCell(rEtiquetteAjout, 1);
  cLabel.value = 'AJOUTS DU JOUR (élèves ou profs inscrits sur place)';
  cLabel.font = { italic: true, size: 9, color: { argb: 'FF8A8A8A' } };
  cuisine.mergeCells(rEtiquetteAjout, 1, rEtiquetteAjout, derniereColonne);

  const rPremiereLigneVierge = rEtiquetteAjout + 1;
  const rDerniereLigneVierge = rPremiereLigneVierge + LIGNES_AJOUTS_DU_JOUR - 1;
  for (let r = rPremiereLigneVierge; r <= rDerniereLigneVierge; r++) {
    for (let c = 1; c <= derniereColonne; c++) {
      cuisine.getCell(r, c).border = { bottom: { style: 'dotted', color: { argb: 'FFC9C9C9' } } };
    }
  }

  // Totaux par jour — ce que la cuisine doit préparer. Christine les avait
  // au bas de sa feuille ; ils étaient tapés à la main. La plage COUNTA
  // couvre aussi les lignes d'ajouts du jour : un nom écrit à la main dans
  // ces cases s'additionne tout seul, sans recalcul de la formule.
  const rTot = rDerniereLigneVierge + 1;
  cuisine.getCell(rTot, 1).value = 'TOTAUX';
  cuisine.getCell(rTot, 1).font = { bold: true };
  journees.forEach((_, i) => {
    for (let k = 0; k < COLS_PAR_JOUR; k++) {
      const c = COL_JOURS_DEBUT + i * COLS_PAR_JOUR + k;
      const lettre = cuisine.getColumn(c).letter;
      const cel = cuisine.getCell(rTot, c);
      // Une formule plutôt qu'un nombre figé : si Christine corrige une
      // case à la main, le total suit au lieu de mentir.
      cel.value = { formula: `COUNTA(${lettre}4:${lettre}${rDerniereLigneVierge})`, result: undefined };
      cel.font = { bold: true };
      cel.alignment = { horizontal: 'center' };
      cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT_PALE } };
    }
  });

  cuisine.getColumn(1).width = 34;
  cuisine.getColumn(2).width = 10;
  for (let c = COL_JOURS_DEBUT; c <= derniereColonne; c++) cuisine.getColumn(c).width = 7;

  // Filtre automatique sur la feuille cuisine elle-même — Christine
  // regroupe ensuite par service de dîner (variable d'une école à l'autre)
  // directement dans Excel avec la colonne Niveau.
  cuisine.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3 + commandes.length + registreSeuls.length, column: derniereColonne },
  };

  // ------------------------------------------------------------------
  // Feuille 2 — DÉTAIL (ce qu'elle vérifiait à côté)
  // ------------------------------------------------------------------
  const detail = classeur.addWorksheet('Détail', { views: [{ state: 'frozen', ySplit: 2 }] });
  const entetes = [
    'Nom', 'Prénom', 'Niveau', 'Allergies / intolérances',
    ...journees.map((j) => `${j.jourSemaine} ${jourDuMoisUTC(j.date.toISOString())}`),
    'Mode de paiement', 'Payé', 'Total', 'Parent', 'Téléphone', 'Courriel',
  ];
  detail.getCell(1, 1).value = titre;
  detail.getCell(1, 1).font = { bold: true, size: 13, color: { argb: VERT } };
  entetes.forEach((h, i) => {
    const cel = detail.getCell(2, i + 1);
    cel.value = h;
    cel.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT } };
    cel.alignment = { vertical: 'middle', wrapText: true };
  });

  commandes.forEach((cmd, idx) => {
    const r = 3 + idx;
    const allergies = [...cmd.enfant.intolerances, cmd.enfant.autreIntolerance].filter(Boolean).join(', ');
    const total = cmd.lignes.reduce(
      (s, l) => s + prixLigne(l, selectionVersTexte(l.selection)), 0,
    );

    detail.getCell(r, 1).value = cmd.enfant.nomDeFamille;
    detail.getCell(r, 2).value = cmd.enfant.prenom;
    detail.getCell(r, 3).value = cmd.enfant.niveau;
    detail.getCell(r, 4).value = allergies;

    journees.forEach((j, i) => {
      const ligne = cmd.lignes.find((l) => l.journeeId === j.id);
      const cel = detail.getCell(r, 5 + i);
      cel.alignment = { horizontal: 'center' };
      if (!ligne) { cel.value = 0; return; }
      const iSel = j.selections.findIndex((s) => s.id === ligne.selectionId);
      // Même code que dans son fichier de travail : 1, 2… et « P » collé
      // au chiffre quand c'est une Portion + (1P).
      cel.value = `${Math.max(0, iSel) + 1}${ligne.taille === 'DEUXIEME_SERVICE' ? 'P' : ''}`;
    });

    const c0 = 5 + journees.length;
    detail.getCell(r, c0).value = LABEL_PAIEMENT[cmd.modePaiement] ?? cmd.modePaiement;
    detail.getCell(r, c0 + 1).value = cmd.paye ? 'Oui' : 'Non';
    const cTotal = detail.getCell(r, c0 + 2);
    cTotal.value = total;
    cTotal.numFmt = '#,##0.00 $';
    detail.getCell(r, c0 + 3).value = cmd.compteParent.nom;
    detail.getCell(r, c0 + 4).value = cmd.compteParent.telephone ?? '';
    detail.getCell(r, c0 + 5).value = cmd.compteParent.courriel;
  });

  // Le filtre automatique donne à Christine le tri par niveau, par allergie
  // ou par mode de paiement sans rien construire — c'est précisément ce
  // qu'elle refaisait à la main dans son fichier intermédiaire.
  detail.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: 2 + commandes.length, column: entetes.length },
  };
  [22, 16, 14, 26].forEach((w, i) => (detail.getColumn(i + 1).width = w));
  for (let i = 0; i < journees.length; i++) detail.getColumn(5 + i).width = 8;
  [18, 7, 11, 22, 15, 30].forEach((w, i) => (detail.getColumn(5 + journees.length + i).width = w));

  const buffer = (await classeur.xlsx.writeBuffer()) as ArrayBuffer;
  const nomFichier = `${menu.institution.nom} - ${menu.thematiqueRef?.nom ?? 'Menu'} - ${fmtFichier(menu.periodeDebut)}.xlsx`
    .replace(/[/\\?%*:|"<>]/g, '-');
  return { buffer, nomFichier };
}

function fmt(d: Date): string {
  return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', timeZone: 'UTC' });
}
function fmtFichier(d: Date): string {
  return d.toISOString().slice(0, 10);
}
