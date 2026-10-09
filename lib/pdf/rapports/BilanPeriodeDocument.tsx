// lib/pdf/rapports/BilanPeriodeDocument.tsx
// Rapport 6/6 — vue consolidée mois par mois sur la période choisie (bilan
// de fin d'année ou présentation à un conseil d'établissement).
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { enregistrerPolices } from '../fonts';
import EnteteRapport from '../EnteteRapport';
import { stylesRapport, fmtDollars } from '../rapportStyles';
import type { PhotoResolue } from '../MenuDocument';

enregistrerPolices();

const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function libelleMois(cle: string) {
  const [annee, mois] = cle.split('-');
  return `${MOIS_FR[parseInt(mois, 10) - 1]} ${annee}`;
}

export type BilanPeriodeProps = {
  logo: PhotoResolue;
  periodeTexte: string;
  institutionFiltre: string | null;
  parMois: { mois: string; commandes: number; repas: number; revenu: number }[];
};

export default function BilanPeriodeDocument({ logo, periodeTexte, institutionFiltre, parMois }: BilanPeriodeProps) {
  const total = parMois.reduce((acc, m) => ({ commandes: acc.commandes + m.commandes, repas: acc.repas + m.repas, revenu: acc.revenu + m.revenu }), { commandes: 0, repas: 0, revenu: 0 });

  return (
    <Document title="Bilan de période — Traiteur La Pomme Verte" author="Traiteur La Pomme Verte">
      <Page size="LETTER" style={stylesRapport.page} wrap>
        <EnteteRapport logo={logo} sousMarque="Rapport de gestion" periodeTexte={periodeTexte} />
        <Text style={stylesRapport.titre}>Bilan de période</Text>
        <Text style={stylesRapport.sousTitre}>{institutionFiltre ?? 'Toutes les écoles'}</Text>

        <View style={stylesRapport.tuiles}>
          <View style={stylesRapport.tuile}>
            <Text style={stylesRapport.tuileLabel}>Revenu total</Text>
            <Text style={stylesRapport.tuileValeur}>{fmtDollars(total.revenu)}</Text>
          </View>
          <View style={stylesRapport.tuile}>
            <Text style={stylesRapport.tuileLabel}>Commandes</Text>
            <Text style={stylesRapport.tuileValeur}>{total.commandes}</Text>
          </View>
          <View style={stylesRapport.tuile}>
            <Text style={stylesRapport.tuileLabel}>Repas servis</Text>
            <Text style={stylesRapport.tuileValeur}>{total.repas}</Text>
          </View>
        </View>

        <View style={stylesRapport.tableEntete}>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '34%' }]}>Mois</Text>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '22%', textAlign: 'right' }]}>Commandes</Text>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '22%', textAlign: 'right' }]}>Repas</Text>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '22%', textAlign: 'right' }]}>Revenu</Text>
        </View>
        {parMois.map((m) => (
          <View key={m.mois} style={stylesRapport.tableLigne} wrap={false}>
            <Text style={[stylesRapport.tableTexte, { width: '34%', textTransform: 'capitalize' }]}>{libelleMois(m.mois)}</Text>
            <Text style={[stylesRapport.tableTexteMuted, { width: '22%', textAlign: 'right' }]}>{m.commandes}</Text>
            <Text style={[stylesRapport.tableTexteMuted, { width: '22%', textAlign: 'right' }]}>{m.repas}</Text>
            <Text style={[stylesRapport.tableTexteGras, { width: '22%', textAlign: 'right' }]}>{fmtDollars(m.revenu)}</Text>
          </View>
        ))}
        <View style={stylesRapport.tableTotal}>
          <Text style={[stylesRapport.tableTexteGras, { width: '34%' }]}>Total</Text>
          <Text style={[stylesRapport.tableTexteGras, { width: '22%', textAlign: 'right' }]}>{total.commandes}</Text>
          <Text style={[stylesRapport.tableTexteGras, { width: '22%', textAlign: 'right' }]}>{total.repas}</Text>
          <Text style={[stylesRapport.tableTexteGras, { width: '22%', textAlign: 'right' }]}>{fmtDollars(total.revenu)}</Text>
        </View>

        {parMois.length === 0 && <Text style={stylesRapport.sousTitre}>Aucune donnée pour cette période.</Text>}
      </Page>
    </Document>
  );
}
