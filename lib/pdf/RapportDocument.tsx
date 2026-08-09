// lib/pdf/RapportDocument.tsx
// Rapport de préparation — l'outil du matin pour la cuisine : combien
// préparer de chaque plat, par journée, pour un menu donné. Brandé
// comme le PDF de menu (lib/pdf/MenuDocument.tsx), même police.
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { enregistrerPolices } from './fonts';
import type { PhotoResolue } from './MenuDocument';

enregistrerPolices();

const COULEURS = {
  ink: '#16210F',
  inkMuted: '#52623F',
  appleDeep: '#3B8C47',
  leafDeep: '#123512',
  soft: '#F0F5E7',
  line: '#DCE3D1',
  warn: '#B5540C',
};

const styles = StyleSheet.create({
  page: { fontFamily: 'Nunito', fontSize: 10, color: COULEURS.ink, backgroundColor: '#FFFFFF', padding: 32 },
  entete: {
    flexDirection: 'row', alignItems: 'center', borderBottom: `2 solid ${COULEURS.appleDeep}`,
    paddingBottom: 12, marginBottom: 16,
  },
  logo: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  marque: { fontSize: 12, fontWeight: 800, color: COULEURS.leafDeep },
  sousMarque: { fontSize: 8, color: COULEURS.inkMuted, marginTop: 1 },
  titre: { fontSize: 18, fontWeight: 800, color: COULEURS.leafDeep, marginBottom: 3 },
  institutionNom: { fontSize: 11, fontWeight: 700, color: COULEURS.appleDeep, marginBottom: 14 },
  journee: { marginBottom: 10, padding: 10, backgroundColor: COULEURS.soft, borderRadius: 8 },
  jourEntete: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  jourLabel: { fontSize: 11, fontWeight: 800, color: COULEURS.ink },
  jourTotal: { fontSize: 9, fontWeight: 700, color: COULEURS.appleDeep },
  ligne: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, borderTop: `1 solid #FFFFFF` },
  platNom: { fontSize: 9.5, color: COULEURS.ink },
  platCompte: { fontSize: 10, fontWeight: 800, color: COULEURS.leafDeep },
  sectionTitre: { fontSize: 11, fontWeight: 800, color: COULEURS.leafDeep, marginTop: 16, marginBottom: 8, borderTop: `1 solid ${COULEURS.line}`, paddingTop: 12 },
  allergieLigne: { flexDirection: 'row', paddingVertical: 3, borderBottom: `1 solid ${COULEURS.line}` },
  allergieNom: { fontSize: 9.5, fontWeight: 700, width: 160 },
  allergieDetail: { fontSize: 9.5, color: COULEURS.warn, fontWeight: 700, flex: 1 },
  grandTotal: { marginTop: 10, paddingTop: 10, borderTop: `2 solid ${COULEURS.appleDeep}`, flexDirection: 'row', justifyContent: 'space-between' },
  grandTotalLabel: { fontSize: 11, fontWeight: 800, color: COULEURS.leafDeep },
  grandTotalValeur: { fontSize: 13, fontWeight: 800, color: COULEURS.leafDeep },
});

export type JourneeRapport = { id: string; date: string; jourSemaine: string; plats: { nom: string; compte: number }[] };
export type AllergieRapport = { nom: string; detail: string };

export type RapportDocumentProps = {
  institutionNom: string;
  thematique: string | null;
  logoTraiteur: PhotoResolue;
  journees: JourneeRapport[];
  allergies: AllergieRapport[];
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

export default function RapportDocument({ institutionNom, thematique, logoTraiteur, journees, allergies }: RapportDocumentProps) {
  const grandTotal = journees.reduce((n, j) => n + j.plats.reduce((s, p) => s + p.compte, 0), 0);

  return (
    <Document title={`Rapport de préparation — ${institutionNom}`} author="Traiteur La Pomme Verte">
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.entete}>
          {logoTraiteur && <Image src={logoTraiteur} style={styles.logo} />}
          <View>
            <Text style={styles.marque}>Traiteur La Pomme Verte</Text>
            <Text style={styles.sousMarque}>Rapport de préparation</Text>
          </View>
        </View>

        <Text style={styles.titre}>{thematique || 'Menu'}</Text>
        <Text style={styles.institutionNom}>{institutionNom}</Text>

        {journees.map((j) => {
          const totalJour = j.plats.reduce((s, p) => s + p.compte, 0);
          return (
            <View key={j.id} style={styles.journee} wrap={false}>
              <View style={styles.jourEntete}>
                <Text style={styles.jourLabel}>{j.jourSemaine} {fmtDate(j.date)}</Text>
                <Text style={styles.jourTotal}>{totalJour} repas</Text>
              </View>
              {j.plats.map((p) => (
                <View key={p.nom} style={styles.ligne}>
                  <Text style={styles.platNom}>{p.nom}</Text>
                  <Text style={styles.platCompte}>{p.compte}×</Text>
                </View>
              ))}
            </View>
          );
        })}

        <View style={styles.grandTotal}>
          <Text style={styles.grandTotalLabel}>Total du menu</Text>
          <Text style={styles.grandTotalValeur}>{grandTotal} repas</Text>
        </View>

        {allergies.length > 0 && (
          <>
            <Text style={styles.sectionTitre}>Allergies et intolérances à surveiller</Text>
            {allergies.map((a) => (
              <View key={a.nom} style={styles.allergieLigne} wrap={false}>
                <Text style={styles.allergieNom}>{a.nom}</Text>
                <Text style={styles.allergieDetail}>{a.detail}</Text>
              </View>
            ))}
          </>
        )}
      </Page>
    </Document>
  );
}
