// lib/pdf/rapports/SoldesPrepayesDocument.tsx
// Rapport 4/6 — état courant de tous les soldes prépayés libres actifs
// (voir lib/solde-prepaye.ts) : déposé, consommé, disponible par famille.
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { enregistrerPolices } from '../fonts';
import EnteteRapport from '../EnteteRapport';
import { stylesRapport, fmtDollars } from '../rapportStyles';
import type { PhotoResolue } from '../MenuDocument';
import type { SoldePrepayeRapport } from '../../rapports';

enregistrerPolices();

export type SoldesPrepayesProps = {
  logo: PhotoResolue;
  institutionFiltre: string | null;
  soldes: SoldePrepayeRapport[];
};

export default function SoldesPrepayesDocument({ logo, institutionFiltre, soldes }: SoldesPrepayesProps) {
  const total = soldes.reduce(
    (acc, s) => ({ depose: acc.depose + s.totalDepose, consomme: acc.consomme + s.consomme, disponible: acc.disponible + s.disponible }),
    { depose: 0, consomme: 0, disponible: 0 }
  );

  return (
    <Document title="Soldes prépayés — Traiteur La Pomme Verte" author="Traiteur La Pomme Verte">
      <Page size="LETTER" style={stylesRapport.page} wrap>
        <EnteteRapport logo={logo} sousMarque="Rapport de gestion" periodeTexte="État en date d'aujourd'hui" />
        <Text style={stylesRapport.titre}>Soldes prépayés (libres)</Text>
        <Text style={stylesRapport.sousTitre}>{institutionFiltre ?? 'Toutes les écoles'} · {soldes.length} compte{soldes.length > 1 ? 's' : ''} actif{soldes.length > 1 ? 's' : ''}</Text>

        <View style={stylesRapport.tuiles}>
          <View style={stylesRapport.tuile}>
            <Text style={stylesRapport.tuileLabel}>Total déposé</Text>
            <Text style={stylesRapport.tuileValeur}>{fmtDollars(total.depose)}</Text>
          </View>
          <View style={stylesRapport.tuile}>
            <Text style={stylesRapport.tuileLabel}>Total consommé</Text>
            <Text style={stylesRapport.tuileValeur}>{fmtDollars(total.consomme)}</Text>
          </View>
          <View style={stylesRapport.tuile}>
            <Text style={stylesRapport.tuileLabel}>Disponible</Text>
            <Text style={stylesRapport.tuileValeur}>{fmtDollars(total.disponible)}</Text>
          </View>
        </View>

        <View style={stylesRapport.tableEntete}>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '28%' }]}>Parent</Text>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '25%' }]}>École(s)</Text>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '16%', textAlign: 'right' }]}>Déposé</Text>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '16%', textAlign: 'right' }]}>Consommé</Text>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '15%', textAlign: 'right' }]}>Disponible</Text>
        </View>
        {soldes.map((s) => (
          <View key={s.compteParentId} style={stylesRapport.tableLigne} wrap={false}>
            <Text style={[stylesRapport.tableTexte, { width: '28%' }]}>{s.nom}</Text>
            <Text style={[stylesRapport.tableTexteMuted, { width: '25%' }]}>{s.institutions.join(', ')}</Text>
            <Text style={[stylesRapport.tableTexteMuted, { width: '16%', textAlign: 'right' }]}>{fmtDollars(s.totalDepose)}</Text>
            <Text style={[stylesRapport.tableTexteMuted, { width: '16%', textAlign: 'right' }]}>{fmtDollars(s.consomme)}</Text>
            <Text style={[stylesRapport.tableTexteGras, { width: '15%', textAlign: 'right' }]}>{fmtDollars(s.disponible)}</Text>
          </View>
        ))}
        <View style={stylesRapport.tableTotal}>
          <Text style={[stylesRapport.tableTexteGras, { width: '53%' }]}>Total</Text>
          <Text style={[stylesRapport.tableTexteGras, { width: '16%', textAlign: 'right' }]}>{fmtDollars(total.depose)}</Text>
          <Text style={[stylesRapport.tableTexteGras, { width: '16%', textAlign: 'right' }]}>{fmtDollars(total.consomme)}</Text>
          <Text style={[stylesRapport.tableTexteGras, { width: '15%', textAlign: 'right' }]}>{fmtDollars(total.disponible)}</Text>
        </View>

        {soldes.length === 0 && <Text style={stylesRapport.sousTitre}>Aucun solde prépayé actif pour ce filtre.</Text>}
      </Page>
    </Document>
  );
}
