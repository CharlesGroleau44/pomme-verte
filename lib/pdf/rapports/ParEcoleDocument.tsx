// lib/pdf/rapports/ParEcoleDocument.tsx
// Rapport 2/6 — répartition des commandes et du revenu par école, pour
// comparer les institutions entre elles sur une même période.
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { enregistrerPolices } from '../fonts';
import EnteteRapport from '../EnteteRapport';
import { stylesRapport, fmtDollars } from '../rapportStyles';
import type { PhotoResolue } from '../MenuDocument';

enregistrerPolices();

export type ParEcoleProps = {
  logo: PhotoResolue;
  periodeTexte: string;
  ecoles: { institutionNom: string; commandes: number; repas: number; revenu: number; nonPaye: number }[];
};

export default function ParEcoleDocument({ logo, periodeTexte, ecoles }: ParEcoleProps) {
  const total = ecoles.reduce(
    (acc, e) => ({ commandes: acc.commandes + e.commandes, repas: acc.repas + e.repas, revenu: acc.revenu + e.revenu, nonPaye: acc.nonPaye + e.nonPaye }),
    { commandes: 0, repas: 0, revenu: 0, nonPaye: 0 }
  );

  return (
    <Document title="Rapport par école — Traiteur La Pomme Verte" author="Traiteur La Pomme Verte">
      <Page size="LETTER" style={stylesRapport.page} wrap>
        <EnteteRapport logo={logo} sousMarque="Rapport de gestion" periodeTexte={periodeTexte} />
        <Text style={stylesRapport.titre}>Répartition par école</Text>
        <Text style={stylesRapport.sousTitre}>{ecoles.length} école{ecoles.length > 1 ? 's' : ''} avec au moins une commande</Text>

        <View style={stylesRapport.tableEntete}>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '34%' }]}>École</Text>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '16%', textAlign: 'right' }]}>Commandes</Text>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '16%', textAlign: 'right' }]}>Repas</Text>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '17%', textAlign: 'right' }]}>Revenu</Text>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '17%', textAlign: 'right' }]}>À percevoir</Text>
        </View>
        {ecoles.map((e) => (
          <View key={e.institutionNom} style={stylesRapport.tableLigne} wrap={false}>
            <Text style={[stylesRapport.tableTexte, { width: '34%' }]}>{e.institutionNom}</Text>
            <Text style={[stylesRapport.tableTexteMuted, { width: '16%', textAlign: 'right' }]}>{e.commandes}</Text>
            <Text style={[stylesRapport.tableTexteMuted, { width: '16%', textAlign: 'right' }]}>{e.repas}</Text>
            <Text style={[stylesRapport.tableTexteGras, { width: '17%', textAlign: 'right' }]}>{fmtDollars(e.revenu)}</Text>
            <Text style={[stylesRapport.tableTexteMuted, { width: '17%', textAlign: 'right' }]}>{e.nonPaye > 0 ? fmtDollars(e.nonPaye) : '—'}</Text>
          </View>
        ))}
        <View style={stylesRapport.tableTotal}>
          <Text style={[stylesRapport.tableTexteGras, { width: '34%' }]}>Total</Text>
          <Text style={[stylesRapport.tableTexteGras, { width: '16%', textAlign: 'right' }]}>{total.commandes}</Text>
          <Text style={[stylesRapport.tableTexteGras, { width: '16%', textAlign: 'right' }]}>{total.repas}</Text>
          <Text style={[stylesRapport.tableTexteGras, { width: '17%', textAlign: 'right' }]}>{fmtDollars(total.revenu)}</Text>
          <Text style={[stylesRapport.tableTexteGras, { width: '17%', textAlign: 'right' }]}>{fmtDollars(total.nonPaye)}</Text>
        </View>

        {ecoles.length === 0 && <Text style={stylesRapport.sousTitre}>Aucune commande dans cette période.</Text>}
      </Page>
    </Document>
  );
}
