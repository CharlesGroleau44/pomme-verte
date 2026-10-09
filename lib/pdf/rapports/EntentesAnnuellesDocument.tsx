// lib/pdf/rapports/EntentesAnnuellesDocument.tsx
// Rapport 3/6 — état courant (« aujourd'hui ») de toutes les ententes
// annuelles actives : versements, repas consommés/restants. Pas de fenêtre
// de dates — c'est un solde vivant (voir lib/entente.ts), pas une période.
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { enregistrerPolices } from '../fonts';
import EnteteRapport from '../EnteteRapport';
import { stylesRapport, fmtDollars } from '../rapportStyles';
import type { PhotoResolue } from '../MenuDocument';
import type { EntenteRapport } from '../../rapports';

enregistrerPolices();

export type EntentesAnnuellesProps = {
  logo: PhotoResolue;
  institutionFiltre: string | null;
  ententes: EntenteRapport[];
};

function etatVersementTexte(v: EntenteRapport['versement2']) {
  if (!v) return '—';
  if (v.enRetard) return 'En retard';
  if (v.approche) return 'Bientôt dû';
  return 'À venir';
}

export default function EntentesAnnuellesDocument({ logo, institutionFiltre, ententes }: EntentesAnnuellesProps) {
  const totalRepasRestants = ententes.reduce((s, e) => s + e.repasRestants, 0);
  const nbEnRetard = ententes.filter((e) => e.versement2?.enRetard).length;

  return (
    <Document title="Ententes annuelles — Traiteur La Pomme Verte" author="Traiteur La Pomme Verte">
      <Page size="LETTER" style={stylesRapport.page} wrap>
        <EnteteRapport logo={logo} sousMarque="Rapport de gestion" periodeTexte="État en date d'aujourd'hui" />
        <Text style={stylesRapport.titre}>Ententes annuelles</Text>
        <Text style={stylesRapport.sousTitre}>{institutionFiltre ?? 'Toutes les écoles'} · {ententes.length} entente{ententes.length > 1 ? 's' : ''} active{ententes.length > 1 ? 's' : ''}</Text>

        <View style={stylesRapport.tuiles}>
          <View style={stylesRapport.tuile}>
            <Text style={stylesRapport.tuileLabel}>Ententes actives</Text>
            <Text style={stylesRapport.tuileValeur}>{ententes.length}</Text>
          </View>
          <View style={stylesRapport.tuile}>
            <Text style={stylesRapport.tuileLabel}>Repas restants (total)</Text>
            <Text style={stylesRapport.tuileValeur}>{totalRepasRestants}</Text>
          </View>
          <View style={stylesRapport.tuile}>
            <Text style={stylesRapport.tuileLabel}>2e versements en retard</Text>
            <Text style={stylesRapport.tuileValeur}>{nbEnRetard}</Text>
          </View>
        </View>

        <View style={stylesRapport.tableEntete}>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '24%' }]}>Élève</Text>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '22%' }]}>École</Text>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '10%' }]}>Niveau</Text>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '16%', textAlign: 'right' }]}>Repas rest.</Text>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '14%', textAlign: 'right' }]}>Solde $</Text>
          <Text style={[stylesRapport.tableEnteteTexte, { width: '14%', textAlign: 'right' }]}>2e versement</Text>
        </View>
        {ententes.map((e) => (
          <View key={e.enfantId} style={stylesRapport.tableLigne} wrap={false}>
            <Text style={[stylesRapport.tableTexte, { width: '24%' }]}>{e.enfantNom}</Text>
            <Text style={[stylesRapport.tableTexteMuted, { width: '22%' }]}>{e.institutionNom}</Text>
            <Text style={[stylesRapport.tableTexteMuted, { width: '10%' }]}>{e.niveau}</Text>
            <Text style={[stylesRapport.tableTexte, { width: '16%', textAlign: 'right' }]}>{e.repasUtilises}/{e.repasInclus}</Text>
            <Text style={[stylesRapport.tableTexteGras, { width: '14%', textAlign: 'right' }]}>{fmtDollars(e.soldeDollars)}</Text>
            <Text style={[e.versement2?.enRetard ? { ...stylesRapport.tableTexte, color: '#B23A2E', fontWeight: 700 } : stylesRapport.tableTexteMuted, { width: '14%', textAlign: 'right' }]}>
              {etatVersementTexte(e.versement2)}
            </Text>
          </View>
        ))}

        {ententes.length === 0 && <Text style={stylesRapport.sousTitre}>Aucune entente annuelle active pour ce filtre.</Text>}
      </Page>
    </Document>
  );
}
