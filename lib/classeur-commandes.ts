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
  // Imprimable telle quelle sur du 8,5 × 11 po (Christine, 26 octobre 2026 :
  // « on refait toutes les cases pour qu'elles soient imprimables ») — voir
  // pageSetup plus bas : portrait, une page de large, entêtes répétés.
  const cuisine = classeur.addWorksheet('Cuisine', {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 3 }], // le nom et les entêtes restent visibles
  });

  // 3 sous-colonnes par journée : M1, M2, P (Portion +) — décalées d'une
  // colonne par la colonne N (niveau, voir ci-dessous).
  const COLS_PAR_JOUR = 3;
  const COL_JOURS_DEBUT = 3;
  const derniereColonne = (COL_JOURS_DEBUT - 1) + journees.length * COLS_PAR_JOUR;
  const estDebutJour = (c: number) => c >= COL_JOURS_DEBUT && (c - COL_JOURS_DEBUT) % COLS_PAR_JOUR === 0;
  const GRIS_SEPARATION = 'FF9A9A9A';

  cuisine.getCell(1, 1).value = titre;
  cuisine.getCell(1, 1).font = { bold: true, size: 12, color: { argb: VERT } };

  cuisine.getCell(2, 1).value = 'NOMS';
  cuisine.getCell(2, 1).font = { bold: true, size: 10 };
  journees.forEach((j, i) => {
    const c = COL_JOURS_DEBUT + i * COLS_PAR_JOUR;
    const cel = cuisine.getCell(2, c);
    // Jour abrégé (« Mer 18 ») : la case fusionnée ne fait que trois petites
    // colonnes de large, le nom complet ne tiendrait pas sur la page.
    cel.value = `${j.jourSemaine.slice(0, 3)} ${jourDuMoisUTC(j.date.toISOString())}`;
    cuisine.mergeCells(2, c, 2, c + COLS_PAR_JOUR - 1);
    cel.alignment = { horizontal: 'center' };
    cel.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT } };
    cel.border = { left: { style: 'thin', color: { argb: 'FFFFFFFF' } } };

    ['M1', 'M2', 'P'].forEach((sous, k) => {
      const sc = cuisine.getCell(3, c + k);
      sc.value = sous;
      sc.font = { bold: true, size: 9 };
      sc.alignment = { horizontal: 'center' };
      sc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT_PALE } };
      if (k === 0) sc.border = { left: { style: 'thin', color: { argb: GRIS_SEPARATION } } };
    });
  });
  cuisine.getCell(3, 1).value = 'Nom, Prénom';
  cuisine.getCell(3, 1).font = { bold: true, size: 10 };
  // N (niveau) en colonne 2. Pour le préscolaire on y met le code du groupe-
  // classe (« 0.N.R ») quand l'école le connaît, sinon « 0 » — même écriture
  // que sa liste papier, et c'est ce qui permet de jumeler une commande du
  // site à la bonne ligne de sa liste.
  cuisine.getCell(3, 2).value = 'N';
  cuisine.getCell(3, 2).font = { bold: true, size: 10 };
  cuisine.getCell(3, 2).alignment = { horizontal: 'center' };
  cuisine.getCell(3, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT_PALE } };

  // Registre officiel de l'école (voir EleveRegistre) — chargé AVANT les
  // lignes, pour que la couleur mauve/orange s'applique aux DEUX cas, pas
  // juste aux élèves du registre sans commande. Correctif du 7 septembre 2026 :
  // un élève en entente annuelle COMMANDE quand même chaque semaine
  // (modePaiement PREPAYE, voir lib/entente.ts) — sa ligne venait donc
  // TOUJOURS de la boucle des commandes réelles, qui n'appliquait jamais cette
  // couleur. cleEleve inclut le niveau (voir lib/normalisation.ts) pour ne
  // jamais confondre deux élèves homonymes de niveaux différents.
  const registre = await prisma.eleveRegistre.findMany({ where: { institutionId: menu.institutionId } });
  const registreParCle = new Map(registre.map((e) => [cleEleve(e.nom, e.prenom, e.niveau), e]));

  // Une seule liste d'élèves : ceux qui ont commandé en ligne ET ceux du
  // registre qui n'ont pas commandé (courriel de Christine du 25 août 2026 :
  // « une seule liste », la cuisine y écrit à la main ses codes 0/P/V/T).
  // Institution sans registre importé = seulement les commandes.
  type LigneEleve = {
    nom: string;
    prenom: string;
    niveau: string;
    groupe: string | null;
    allergies: string;
    fond: string | null;
    cmd: (typeof commandes)[number] | null;
  };
  const lignesEleves: LigneEleve[] = commandes.map((cmd) => {
    const reg = registreParCle.get(cleEleve(cmd.enfant.nomDeFamille, cmd.enfant.prenom, cmd.enfant.niveau));
    return {
      nom: cmd.enfant.nomDeFamille,
      prenom: cmd.enfant.prenom,
      niveau: cmd.enfant.niveau,
      groupe: reg?.groupe ?? null,
      allergies: [...cmd.enfant.intolerances, cmd.enfant.autreIntolerance].filter(Boolean).join(', '),
      fond: reg ? (reg.ententeAnnuelle ? MAUVE_ENTENTE : reg.fondation ? ORANGE_FONDATION : null) : null,
      cmd,
    };
  });
  const dejaCommande = new Set(commandes.map((c) => cleEleve(c.enfant.nomDeFamille, c.enfant.prenom, c.enfant.niveau)));
  for (const e of registre) {
    if (dejaCommande.has(cleEleve(e.nom, e.prenom, e.niveau))) continue;
    lignesEleves.push({
      nom: e.nom,
      prenom: e.prenom,
      niveau: e.niveau,
      groupe: e.groupe,
      allergies: e.allergie ?? '',
      fond: e.ententeAnnuelle ? MAUVE_ENTENTE : e.fondation ? ORANGE_FONDATION : null,
      cmd: null,
    });
  }
  const parNom = (a: LigneEleve, b: LigneEleve) => {
    const n = a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
    return n !== 0 ? n : a.prenom.localeCompare(b.prenom, 'fr', { sensitivity: 'base' });
  };

  // Sections par service de dîner — réglage PAR ÉCOLE (Institution.
  // servicesNiveaux : « 1,2,3 » puis « 4,5,6 » à Plein Soleil), plus un
  // regroupement du préscolaire par classe quand le registre porte les
  // titulaires. Sans réglage : une seule liste alphabétique, comme avant.
  const services = menu.institution.servicesNiveaux.map((s) => s.split(',').map((x) => x.trim()).filter(Boolean));
  const regroupe = services.length > 0;
  type Section = { cle: string; titre: string | null; ordre: number; eleves: LigneEleve[] };
  const sections = new Map<string, Section>();
  const classer = (l: LigneEleve): Omit<Section, 'eleves'> => {
    if (!regroupe) return { cle: 'tous', titre: null, ordre: 0 };
    if (l.niveau === 'Préscolaire') {
      return l.groupe
        ? { cle: `g:${l.groupe}`, titre: `Préscolaire ${l.groupe}`, ordre: 100 }
        : { cle: 'g:?', titre: 'Préscolaire — groupe à préciser', ordre: 200 };
    }
    const i = services.findIndex((s) => s.includes(l.niveau));
    return i >= 0
      ? { cle: `s:${i}`, titre: `Niveaux ${services[i].join('-')}`, ordre: i }
      : { cle: 'autres', titre: 'Autres niveaux', ordre: 300 };
  };
  for (const l of lignesEleves) {
    const { cle, titre: t, ordre } = classer(l);
    if (!sections.has(cle)) sections.set(cle, { cle, titre: t, ordre, eleves: [] });
    sections.get(cle)!.eleves.push(l);
  }
  if (sections.size === 0) sections.set('tous', { cle: 'tous', titre: null, ordre: 0, eleves: [] });
  const sectionsTriees = [...sections.values()]
    .sort((a, b) => a.ordre - b.ordre || (a.titre ?? '').localeCompare(b.titre ?? '', 'fr'))
    .map((s) => ({ ...s, eleves: s.eleves.sort(parNom) }));

  const bordureLigne = (r: number, fond: string | null) => {
    for (let c = 1; c <= derniereColonne; c++) {
      const cel = cuisine.getCell(r, c);
      cel.border = {
        bottom: { style: 'hair', color: { argb: GRIS_SEPARATION } },
        ...(estDebutJour(c) ? { left: { style: 'thin' as const, color: { argb: GRIS_SEPARATION } } } : {}),
      };
      if (fond) cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fond } };
    }
  };

  let r = 4;
  let premiereDataRow = r;
  const sousTotaux: number[] = [];
  let premierBlocPrescolaire = true;

  sectionsTriees.forEach((section, iSection) => {
    if (section.titre) {
      // Un nouveau service = une nouvelle page (le comptoir sert un service
      // à la fois) ; les groupes du préscolaire, courts, s'enchaînent après
      // le premier saut de page.
      const nouvellePage = iSection > 0 && (section.ordre < 100 || premierBlocPrescolaire);
      if (section.ordre >= 100) premierBlocPrescolaire = false;
      if (nouvellePage) cuisine.getRow(r - 1).addPageBreak();
      const t = cuisine.getCell(r, 1);
      t.value = section.titre;
      t.font = { bold: true, size: 11, color: { argb: VERT } };
      for (let c = 1; c <= derniereColonne; c++) {
        cuisine.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT_PALE } };
      }
      cuisine.mergeCells(r, 1, r, derniereColonne);
      r++;
    }
    const debutSection = r;
    if (iSection === 0) premiereDataRow = r;

    for (const l of section.eleves) {
      const nomComplet = `${l.nom}, ${l.prenom}`;
      // Texte enrichi plutôt que deux cellules : le nom reste noir, l'allergie
      // s'ajoute en rouge gras juste à côté — exactement la mécanique papier
      // de Christine, pas une colonne de plus à consulter séparément.
      cuisine.getCell(r, 1).value = l.allergies
        ? { richText: [
            { text: nomComplet, font: { bold: true, size: 10 } },
            { text: `  — ${l.allergies}`, font: { bold: true, size: 10, color: { argb: ROUGE_ALLERGIE } } },
          ] }
        : nomComplet;
      if (!l.allergies) cuisine.getCell(r, 1).font = { size: 10 };
      const celN = cuisine.getCell(r, 2);
      celN.value = l.niveau === 'Préscolaire' ? (l.groupe ?? '0') : l.niveau;
      celN.alignment = { horizontal: 'center' };
      celN.font = { size: 9 };
      bordureLigne(r, l.fond);

      for (const ligne of l.cmd?.lignes ?? []) {
        const iJour = journees.findIndex((j) => j.id === ligne.journeeId);
        if (iJour < 0) continue;
        // « M1 » = la 1re sélection de la journée, « M2 » = la 2e. C'est
        // l'ordre d'ajout au montage du menu, le même que celui vu par le
        // parent — pas un classement arbitraire.
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
      r++;
    }

    // Sous-total par service : ce que la cuisine prépare pour CE service.
    if (regroupe) {
      const rSous = r;
      cuisine.getCell(rSous, 1).value = 'Sous-total';
      cuisine.getCell(rSous, 1).font = { bold: true, size: 9 };
      for (let i = 0; i < journees.length; i++) {
        for (let k = 0; k < COLS_PAR_JOUR; k++) {
          const c = COL_JOURS_DEBUT + i * COLS_PAR_JOUR + k;
          const lettre = cuisine.getColumn(c).letter;
          const cel = cuisine.getCell(rSous, c);
          // Section vide : la plage serait inversée, on écrit simplement 0.
          cel.value = section.eleves.length
            ? { formula: `COUNTA(${lettre}${debutSection}:${lettre}${rSous - 1})`, result: undefined }
            : 0;
          cel.font = { bold: true, size: 9 };
          cel.alignment = { horizontal: 'center' };
        }
      }
      sousTotaux.push(rSous);
      r++;
    }
  });

  // Lignes vierges pour les ajouts du jour — voir LIGNES_AJOUTS_DU_JOUR.
  // Une bordure pointillée sur chaque case marque clairement où écrire à
  // la main, sans imposer de nom de colonne que la cuisine devrait déduire.
  const rEtiquetteAjout = r;
  const cLabel = cuisine.getCell(rEtiquetteAjout, 1);
  cLabel.value = 'AJOUTS DU JOUR (élèves ou profs inscrits sur place)';
  cLabel.font = { italic: true, size: 9, color: { argb: 'FF8A8A8A' } };
  cuisine.mergeCells(rEtiquetteAjout, 1, rEtiquetteAjout, derniereColonne);

  const rPremiereLigneVierge = rEtiquetteAjout + 1;
  const rDerniereLigneVierge = rPremiereLigneVierge + LIGNES_AJOUTS_DU_JOUR - 1;
  for (let rr = rPremiereLigneVierge; rr <= rDerniereLigneVierge; rr++) {
    for (let c = 1; c <= derniereColonne; c++) {
      cuisine.getCell(rr, c).border = { bottom: { style: 'dotted', color: { argb: 'FFC9C9C9' } } };
    }
  }

  // Totaux par jour — ce que la cuisine doit préparer. Les ajouts du jour
  // sont comptés par COUNTA : un nom écrit à la main dans ces cases
  // s'additionne tout seul. Avec des services, le total général additionne
  // les sous-totaux (jamais une plage continue : les titres de section et
  // les sous-totaux s'y trouveraient comptés deux fois).
  const rTot = rDerniereLigneVierge + 1;
  cuisine.getCell(rTot, 1).value = 'TOTAUX';
  cuisine.getCell(rTot, 1).font = { bold: true };
  journees.forEach((_, i) => {
    for (let k = 0; k < COLS_PAR_JOUR; k++) {
      const c = COL_JOURS_DEBUT + i * COLS_PAR_JOUR + k;
      const lettre = cuisine.getColumn(c).letter;
      const cel = cuisine.getCell(rTot, c);
      const ajouts = `COUNTA(${lettre}${rPremiereLigneVierge}:${lettre}${rDerniereLigneVierge})`;
      // Une formule plutôt qu'un nombre figé : si Christine corrige une
      // case à la main, le total suit au lieu de mentir.
      const formule = regroupe
        ? `${sousTotaux.map((s) => `${lettre}${s}`).join('+')}+${ajouts}`
        : `COUNTA(${lettre}${premiereDataRow}:${lettre}${rDerniereLigneVierge})`;
      cel.value = { formula: formule, result: undefined };
      cel.font = { bold: true, size: 9 };
      cel.alignment = { horizontal: 'center' };
      cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT_PALE } };
    }
  });

  // Largeurs calculées pour tenir sur 8,5 po en portrait avec 10 journées
  // (30 petites colonnes) sans que l'impression devienne illisible : voir
  // fitToWidth ci-dessous, qui ajuste l'échelle exacte au besoin.
  cuisine.getColumn(1).width = 28;
  cuisine.getColumn(2).width = 5.5;
  for (let c = COL_JOURS_DEBUT; c <= derniereColonne; c++) cuisine.getColumn(c).width = 3.2;

  cuisine.pageSetup = {
    paperSize: 1 as ExcelJS.PaperSize, // Letter, 8,5 × 11 po
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0, // autant de pages que nécessaire en hauteur
    horizontalCentered: true,
    margins: { left: 0.4, right: 0.4, top: 0.55, bottom: 0.6, header: 0.25, footer: 0.3 },
    printTitlesRow: '2:3', // entêtes des jours répétés sur chaque page
  };
  cuisine.headerFooter.oddFooter = '&L&8&A&C&8Page &P de &N&R&8Imprimé le &D';

  // Sans service configuré, le filtre automatique reste (comme avant) ; avec
  // des sections, il mélangerait titres et sous-totaux — le regroupement
  // remplace ce que Christine faisait à la main avec le filtre.
  if (!regroupe) {
    cuisine.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: rEtiquetteAjout - 1, column: derniereColonne },
    };
  }

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

  detail.pageSetup = {
    paperSize: 1 as ExcelJS.PaperSize,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.55, bottom: 0.6, header: 0.25, footer: 0.3 },
    printTitlesRow: '2:2',
  };

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
