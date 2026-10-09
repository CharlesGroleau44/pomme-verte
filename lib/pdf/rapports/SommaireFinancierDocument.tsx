// lib/pdf/rapports/SommaireFinancierDocument.tsx
// Rapport 1/6 — revenu de la période, ventilation par mode de paiement,
// montant à percevoir, comparaison à la période précédente de même durée.
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { enregistrerPolices } from '../fonts';
import EnteteRapport from '../EnteteRapport';
import { stylesRapport, fmtDollars, LABEL_PAIEMENT } from '../rapportStyles';
import type { PhotoResolue } from '../MenuDocument';

enregistrerPolices();

export type SommaireFinancierProps = {
  logo: PhotoResolue;
  periodeTexte: string;
  institutionFiltre: string | null;
  totaux: { revenu: number; repas: number; commandes: number; nonPaye: number };
  totauxPrecedents: { revenu: number; repas: number; commandes: number; nonPaye: number } | null;
  periodePrecedenteTexte: string | null;
  ventilation: { modePaiement: string; repas: number; revenu: number }[];
};

function delta(actuel: number, precedent: number) {
  if (precedent === 0) return actuel === 0 ? '±0 %' : '—';
  const pct = ((actuel - precedent) / precedent) * 100;
  const signe = pct >= 0 ? '+' : '';
  return `${signe}${pct.toFixed(0)} %`;
}

export default function SommaireFinancierDocument({ logo, periodeTexte, institutionFiltre, totaux, totauxPrecedents, periodePrecedenteTexte, ventilation }: SommaireFinancierProps) {
  return (
    <Document title="Sommaire financier — Traiteur La Pomme Verte" author="Traiteur La Pomme Verte">
      <Page size="LETTER" style={stylesRapport.page} wrap>
        <EnteteRapport logo={logo} sousMarque="Rapport de gestion" periodeTexte={periodeTexte} />
        <Text style={stylesRapport.titre}>Sommaire financier</Text>
        <Text style={stylesRapport.sousTitre}>{institutionFiltre ?? 'Toutes les écoles'}</Text>

        <View style={stylesRapport.tuiles}>
          <View style={stylesRapport.tuile}>
            <Text style={stylesRapport.tuileLabel}>Revenu</Text>
            <Text style={stylesRapport.tuileValeur}>{fmtDollars(totaux.revenu)}</Text>
            {totauxPrecedents && <Text style={stylesRapport.tuileSousTexte}>{delta(totaux.revenu, totauxPrecedents.revenu)} vs période précédente</Text>}
          </View>
          <View style={stylesRapport.tuile}>
            <Text style={stylesRapport.tuileLabel}>Commandes</Text>
            <Text style={stylesRapport.tuileValeur}>{totaux.commandes}</Text>
            {totauxPrecedents && <Text style={stylesRapport.tuileSousTexte}>{delta(totaux.commandes, totauxPrecedents.commandes)} vs période précédente</Text>}
          </View>
          <View style={stylesRapport.tuile}>
            <Text style={stylesRapport.tuileLabel}>Repas servis</Text>
            <Text style={stylesRapport.tuileValeur}>{totaux.repas}</Text>
            {totauxPrecedents && <Text style={stylesRapport.tuileSousTexte}>{delta(totaux.repas, totauxPrecedents.repas)} vs période précédente</Text>}
          </View>
          <View style={stylesRapport.tuile}>
            <Text style={stylesRapport.tuileLabel}>À percevoir</Text>
            <Text style={stylesRapport.tuileValeur}>{fmtDollars(totaux.nonPaye)}</Text>
          </View>
        </View>

        <Text style={stylesRapport.sectionTitre}>Ventilation par mode de paiement</Text>
        <View style={stylesRapport.tableEntete}>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '45%' }]}>Mode de paiement</Text>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '25%', textAlign: 'right' }]}>Repas</Text>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '30%', textAlign: 'right' }]}>Revenu</Text>
        </View>
        {ventilation.map((v) => (
          <View key={v.modePaiement} style={stylesRapport.tableLigne}>
            <Text style={[stylesRapport.tableTexte, { width: '45%' }]}>{LABEL_PAIEMENT[v.modePaiement] ?? v.modePaiement}</Text>
            <Text style={[stylesRapport.tableTexteMuted, { width: '25%', textAlign: 'right' }]}>{v.repas}</Text>
            <Text style={[stylesRapport.tableTexteGras, { width: '30%', textAlign: 'right' }]}>{fmtDollars(v.revenu)}</Text>
          </View>
        ))}
        <View style={stylesRapport.tableTotal}>
          <Text style={[stylesRapport.tableTexteGras, { width: '45%' }]}>Total</Text>
          <Text style={[stylesRapport.tableTexteGras, { width: '25%', textAlign: 'right' }]}>{totaux.repas}</Text>
          <Text style={[stylesRapport.tableTexteGras, { width: '30%', textAlign: 'right' }]}>{fmtDollars(totaux.revenu)}</Text>
        </View>

        {totauxPrecedents && periodePrecedenteTexte && (
          <Text style={stylesRapport.piedPage}>Comparaison : {periodePrecedenteTexte} — {fmtDollars(totauxPrecedents.revenu)} de revenu, {totauxPrecedents.commandes} commande{totauxPrecedents.commandes > 1 ? 's' : ''}</Text>
        )}
      </Page>
    </Document>
  );
}
