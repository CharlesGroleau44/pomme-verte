// lib/pdf/rapportStyles.ts
// Palette et styles communs aux 6 rapports de gestion (lib/pdf/rapports/) —
// mêmes couleurs que RapportDocument.tsx (rapport de préparation cuisine)
// pour une continuité visuelle avec le reste des documents brandés.
import { StyleSheet } from '@react-pdf/renderer';

export const COULEURS = {
  ink: '#16210F',
  inkMuted: '#52623F',
  appleDeep: '#3B8C47',
  leafDeep: '#123512',
  soft: '#F0F5E7',
  line: '#DCE3D1',
  warn: '#B5540C',
  bon: '#2F7D3C',
  critique: '#B23A2E',
};

export const stylesRapport = StyleSheet.create({
  page: { fontFamily: 'Nunito', fontSize: 10, color: COULEURS.ink, backgroundColor: '#FFFFFF', padding: 32 },
  entete: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: `2 solid ${COULEURS.appleDeep}`, paddingBottom: 12, marginBottom: 16,
  },
  enteteGauche: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  marque: { fontSize: 12, fontWeight: 800, color: COULEURS.leafDeep },
  sousMarque: { fontSize: 8, color: COULEURS.inkMuted, marginTop: 1 },
  periode: { fontSize: 9, color: COULEURS.inkMuted, textAlign: 'right' },
  titre: { fontSize: 18, fontWeight: 800, color: COULEURS.leafDeep, marginBottom: 3 },
  sousTitre: { fontSize: 10, color: COULEURS.inkMuted, marginBottom: 16 },

  // Grille de tuiles KPI
  tuiles: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  tuile: { flex: 1, backgroundColor: COULEURS.soft, borderRadius: 8, padding: 10 },
  tuileLabel: { fontSize: 8, fontWeight: 700, color: COULEURS.inkMuted, textTransform: 'uppercase' },
  tuileValeur: { fontSize: 16, fontWeight: 800, color: COULEURS.leafDeep, marginTop: 3 },
  tuileSousTexte: { fontSize: 8, color: COULEURS.inkMuted, marginTop: 2 },

  sectionTitre: { fontSize: 11, fontWeight: 800, color: COULEURS.leafDeep, marginTop: 14, marginBottom: 8, borderTop: `1 solid ${COULEURS.line}`, paddingTop: 12 },

  // Tableau générique
  tableEntete: { flexDirection: 'row', borderBottom: `1.5 solid ${COULEURS.appleDeep}`, paddingBottom: 5, marginBottom: 4 },
  tableEnteteTexte: { fontSize: 8.5, fontWeight: 800, color: COULEURS.leafDeep, textTransform: 'uppercase' },
  tableLigne: { flexDirection: 'row', paddingVertical: 4, borderBottom: `1 solid ${COULEURS.line}` },
  tableTexte: { fontSize: 9.5, color: COULEURS.ink },
  tableTexteMuted: { fontSize: 9, color: COULEURS.inkMuted },
  tableTexteGras: { fontSize: 9.5, fontWeight: 700, color: COULEURS.leafDeep },
  tableTotal: { flexDirection: 'row', paddingTop: 6, marginTop: 2, borderTop: `2 solid ${COULEURS.appleDeep}` },

  piedPage: { position: 'absolute', bottom: 20, left: 32, right: 32, fontSize: 7.5, color: COULEURS.inkMuted, textAlign: 'center', borderTop: `1 solid ${COULEURS.line}`, paddingTop: 6 },
});

export function fmtDollars(n: number): string {
  return `${n.toFixed(2)} $`;
}

export function fmtDatePeriode(dateDebut?: string | null, dateFin?: string | null): string {
  const fmt = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  if (dateDebut && dateFin) return `Du ${fmt(dateDebut)} au ${fmt(dateFin)}`;
  if (dateDebut) return `Depuis le ${fmt(dateDebut)}`;
  if (dateFin) return `Jusqu'au ${fmt(dateFin)}`;
  return 'Toutes les données';
}

export const LABEL_PAIEMENT: Record<string, string> = {
  ARGENT: 'Argent comptant',
  VIREMENT_INTERAC: 'Virement Interac',
  CHEQUE: 'Chèque',
  PAYPAL: 'Paypal',
  PREPAYE: 'Entente annuelle',
  SOLDE_PREPAYE: 'Solde prépayé',
  FONDATION: 'Fondation',
};
