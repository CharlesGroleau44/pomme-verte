// lib/registre-eleves.ts
// Le registre officiel des élèves d'une école (voir EleveRegistre dans le
// schéma) — importé du fichier Excel que chaque école envoie à Christine,
// pour remplacer la retranscription à la main sur sa feuille de présence
// papier (courriel du 24 août 2026, avec le mémo « Présences & ventes » :
// mauve = entente annuelle, orange = Fondation, rouge = allergie).
//
// CHAQUE ÉCOLE A SON PROPRE GABARIT — vu sur les 5 premiers fichiers reçus
// (24-25 août 2026) : Nom/Prénom parfois combinés dans une seule colonne
// (« Nom, Prénom »), parfois séparés en deux (dans un ordre ou l'autre) ;
// le niveau s'écrit « mat », « 5eme », « 5e », « Mat 4 » ou « PS 4 ans » ;
// Boisé-Fabi envoie même un classeur avec une feuille par classe PLUS une
// feuille consolidée. D'où une détection des colonnes par mot-clé dans
// l'entête (peu importe l'ordre/le nom exact) plutôt qu'une position fixe,
// et le choix de la feuille avec le plus d'élèves reconnus quand il y en a
// plusieurs.
import ExcelJS from 'exceljs';
import { prisma } from './prisma';
import { retirerAccents, cleEleve } from './normalisation';

function normaliserTexte(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

// « ps 4 ans » (Plein Soleil), « mat »/« mat 4 » (Boisé-Fabi, NDL),
// « présco 1/2 » (Dominique-Savio) — toutes des façons différentes d'écrire
// la maternelle/préscolaire.
function normaliserNiveau(brut: string): string {
  const nettoye = brut.trim();
  let cle = normaliserTexte(nettoye);
  if (!cle) return nettoye;
  if (/^(mat|maternelle|prescolaire|presco|ps)\b/.test(cle) || /\bans\b/.test(cle)) return 'Préscolaire';
  // « année »/« annee » n'ajoute rien une fois le chiffre isolé (« 1re
  // année » → « 1re ») — retiré avant la reconnaissance du chiffre.
  cle = cle.replace(/\bannees?\b/g, '').trim();
  // Ancré des DEUX côtés : seul un chiffre isolé, éventuellement suivi d'un
  // suffixe ordinal (« 5eme », « 1re », « 6e »), est reconnu. Un CODE DE
  // GROUPE à 3 chiffres (Brassard « 008 », St-Patrice « 751 », St-Pie X
  // « 100 ») ne matche pas et reste tel quel plutôt que d'être mal découpé
  // (« 008 » → « 0 » serait faux) — Christine connaît son propre système de
  // codes, corrigible à la main dans l'admin au besoin. Un format combiné
  // ambigu (« 2e et 3e année ») reste aussi intact pour la même raison.
  const chiffre = cle.match(/^(\d)\s*(iere|ere|eme|e|re)?$/);
  if (chiffre) return chiffre[1];
  return nettoye;
}

type ColMap = { combine: number | null; nom: number | null; prenom: number | null; niveau: number | null };

function classifierEntete(h: string): 'combine' | 'niveau' | 'ignore' | 'prenom' | 'nom' {
  const cle = normaliserTexte(h);
  if (!cle) return 'ignore';
  if (/^eleves?$/.test(cle)) return 'combine';
  const hasPrenom = /prenom/.test(cle);
  const sansPrenom = cle.replace(/prenom/g, '');
  const hasNom = /nom/.test(sansPrenom);
  if (hasNom && hasPrenom) return 'combine';
  if (/(degre|niveau|classe|annee|groupe)/.test(cle)) return 'niveau';
  if (/(professeur|enseignant|titulaire)/.test(cle)) return 'ignore';
  if (hasPrenom) return 'prenom';
  if (hasNom) return 'nom';
  return 'ignore';
}

function detecterColonnes(entetes: string[]): ColMap | null {
  const map: ColMap = { combine: null, nom: null, prenom: null, niveau: null };
  entetes.forEach((h, i) => {
    const type = classifierEntete(h);
    if (type === 'combine' && map.combine === null) map.combine = i;
    else if (type === 'niveau' && map.niveau === null) map.niveau = i;
    else if (type === 'prenom' && map.prenom === null) map.prenom = i;
    else if (type === 'nom' && map.nom === null) map.nom = i;
  });
  const aUnNom = map.combine !== null || (map.nom !== null && map.prenom !== null);
  if (!aUnNom || map.niveau === null) return null;
  return map;
}

function celluleEnTexte(row: ExcelJS.Row, colonne0Indexe: number): string {
  return String(row.getCell(colonne0Indexe + 1).value ?? '').trim();
}

export type EleveImporte = { nom: string; prenom: string; niveau: string };

/**
 * Lit un classeur Excel — n'importe lequel des gabarits reçus jusqu'ici
 * (voir commentaire du fichier). Cherche l'entête dans les 3 premières
 * lignes de CHAQUE feuille, retient la feuille qui donne le plus d'élèves
 * reconnus (le classeur Boisé-Fabi a une feuille par classe en plus de la
 * consolidée — c'est cette dernière qui doit gagner).
 */
export async function parserFichierEleves(buffer: Buffer): Promise<EleveImporte[]> {
  const classeur = new ExcelJS.Workbook();
  await classeur.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  let meilleur: EleveImporte[] = [];

  for (const feuille of classeur.worksheets) {
    let colMap: ColMap | null = null;
    let ligneEntete = 0;
    for (let l = 1; l <= Math.min(3, feuille.rowCount); l++) {
      const entetes: string[] = [];
      feuille.getRow(l).eachCell({ includeEmpty: true }, (cell, colNumber) => {
        entetes[colNumber - 1] = String(cell.value ?? '');
      });
      const essai = detecterColonnes(entetes);
      if (essai) { colMap = essai; ligneEntete = l; break; }
    }
    if (!colMap) continue;
    const map = colMap;

    const eleves: EleveImporte[] = [];
    feuille.eachRow((row, numeroLigne) => {
      if (numeroLigne <= ligneEntete) return;
      const niveauBrut = map.niveau !== null ? celluleEnTexte(row, map.niveau) : '';
      let nom = '';
      let prenom = '';
      if (map.combine !== null) {
        const combine = celluleEnTexte(row, map.combine);
        const parties = combine.split(',').map((s) => s.trim());
        if (parties.length >= 2) { [nom, prenom] = parties; } else { nom = combine; }
      } else {
        nom = map.nom !== null ? celluleEnTexte(row, map.nom) : '';
        prenom = map.prenom !== null ? celluleEnTexte(row, map.prenom) : '';
      }
      if (!nom || !prenom) return;
      // Accents retirés dès l'import (Christine, courriel du 7 septembre
      // 2026) — évite qu'une même personne épelée différemment d'un import
      // à l'autre (ou entre le registre et le compte parent) soit traitée
      // comme deux élèves distincts.
      eleves.push({ nom: retirerAccents(nom), prenom: retirerAccents(prenom), niveau: normaliserNiveau(niveauBrut) });
    });

    if (eleves.length > meilleur.length) meilleur = eleves;
  }

  // Un même élève ne doit apparaître qu'une fois (contrainte unique en
  // base) — au cas où la feuille retenue contiendrait un doublon. La clé
  // inclut le niveau : deux élèves homonymes de niveaux différents (cas réel
  // de Jacob Roux à Brassard-Saint-Patrice, un en préscolaire et un en 5e
  // année) sont deux personnes, jamais un doublon à éliminer.
  const vus = new Set<string>();
  return meilleur.filter((e) => {
    const cle = cleEleve(e.nom, e.prenom, e.niveau);
    if (vus.has(cle)) return false;
    vus.add(cle);
    return true;
  });
}

/**
 * Remplace le registre d'une institution par la liste importée, en
 * conservant les annotations déjà faites (entente/Fondation/allergie) pour
 * les élèves déjà présents — identifiés par nom + prénom + niveau (voir
 * lib/normalisation.ts), pas par un identifiant stable côté école. Le
 * niveau fait partie de l'identité : un élève qui change de niveau d'un
 * import à l'autre est traité comme parti + un nouveau arrivé (perd ses
 * annotations), plutôt que de risquer de confondre deux homonymes de
 * niveaux différents (cas réel de Jacob Roux, voir cleEleve) — un
 * changement de niveau en cours d'année étant en pratique très rare, ce
 * compromis protège le cas fréquent (homonymes) au prix du cas rare.
 * Un élève qui disparaît du nouvel import (l'école l'a retiré) est retiré
 * du registre ; un nouveau nom est ajouté sans annotation.
 */
export async function remplacerRegistre(institutionId: string, eleves: EleveImporte[]) {
  const existants = await prisma.eleveRegistre.findMany({ where: { institutionId } });
  const existantsParCle = new Map(existants.map((e) => [cleEleve(e.nom, e.prenom, e.niveau), e]));
  const clesImportees = new Set(eleves.map((e) => cleEleve(e.nom, e.prenom, e.niveau)));
  const aRetirer = existants.filter((e) => !clesImportees.has(cleEleve(e.nom, e.prenom, e.niveau))).map((e) => e.id);

  await prisma.$transaction([
    ...eleves.map((e) => {
      const trouve = existantsParCle.get(cleEleve(e.nom, e.prenom, e.niveau));
      return trouve
        ? prisma.eleveRegistre.update({ where: { id: trouve.id }, data: { niveau: e.niveau } })
        : prisma.eleveRegistre.create({ data: { institutionId, nom: e.nom, prenom: e.prenom, niveau: e.niveau } });
    }),
    prisma.eleveRegistre.deleteMany({ where: { id: { in: aRetirer } } }),
  ]);
}

// Couleurs pâles reprenant le code de son mémo papier « Présences & ventes »
// (mauve/orange/rouge) — la priorité d'affichage suit celle du papier :
// l'entente prime sur la Fondation si jamais les deux étaient cochées.
const VERT = 'FF1B4A1E';
const COULEUR_ENTENTE = 'FFE6D6F0';
const COULEUR_FONDATION = 'FFFBE0B8';
const COULEUR_ALLERGIE = 'FFF7D6D3';

export async function construireRegistreExcel(institutionId: string): Promise<{ buffer: ArrayBuffer; nomFichier: string } | null> {
  const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
  if (!institution) return null;

  const eleves = await prisma.eleveRegistre.findMany({
    where: { institutionId },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  });

  const classeur = new ExcelJS.Workbook();
  classeur.creator = 'Traiteur La Pomme Verte';
  const feuille = classeur.addWorksheet('Registre');

  feuille.getCell(1, 1).value = `${institution.nom} — Registre des élèves`;
  feuille.getCell(1, 1).font = { bold: true, size: 13, color: { argb: VERT } };

  const entetes = ['Nom', 'Prénom', 'Niveau', 'Statut'];
  entetes.forEach((h, i) => {
    const cel = feuille.getCell(2, i + 1);
    cel.value = h;
    cel.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT } };
  });

  eleves.forEach((e, idx) => {
    const r = 3 + idx;
    const fill = e.ententeAnnuelle ? COULEUR_ENTENTE : e.fondation ? COULEUR_FONDATION : e.allergie ? COULEUR_ALLERGIE : null;
    const statut = [e.ententeAnnuelle && 'Entente annuelle', e.fondation && 'Fondation', e.allergie].filter(Boolean).join(' — ');
    [e.nom, e.prenom, e.niveau, statut].forEach((v, c) => {
      const cel = feuille.getCell(r, c + 1);
      cel.value = v;
      if (fill) cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    });
  });

  feuille.getColumn(1).width = 22;
  feuille.getColumn(2).width = 18;
  feuille.getColumn(3).width = 12;
  feuille.getColumn(4).width = 28;
  feuille.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2 + eleves.length, column: 4 } };

  const buffer = (await classeur.xlsx.writeBuffer()) as ArrayBuffer;
  const nomFichier = `${institution.nom} - Registre.xlsx`.replace(/[/\\?%*:|"<>]/g, '-');
  return { buffer, nomFichier };
}
