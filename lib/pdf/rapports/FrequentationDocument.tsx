// lib/pdf/rapports/FrequentationDocument.tsx
// Rapport 5/6 — taux de participation aux commandes par école et par
// niveau, sur une période donnée (voir chargerFrequentation dans
// lib/rapports.ts pour la définition exacte du taux).
//
// Mesure les COMPTES PARENTS chez nous (Enfant), pas le registre officiel
// de l'école (EleveRegistre) : les deux listes ne sont pas reliées entre
// elles dans la base (un élève du registre peut n'avoir aucun compte chez
// nous — voir prisma/schema.prisma), un rapprochement par nom serait
// approximatif (accents, surnoms, noms composés) et pourrait afficher un
// taux FAUX à Christine — pire qu'une mesure fiable mais plus étroite.
// D'où le titre et le pied de page explicites ci-dessous : mieux vaut une
// donnée fiable et bien étiquetée qu'une approximation qui a l'air complète.
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { enregistrerPolices } from '../fonts';
import EnteteRapport from '../EnteteRapport';
import { stylesRapport } from '../rapportStyles';
import type { PhotoResolue } from '../MenuDocument';
import type { FrequentationInstitution } from '../../rapports';

enregistrerPolices();

export type FrequentationProps = {
  logo: PhotoResolue;
  periodeTexte: string;
  institutions: FrequentationInstitution[];
};

function pct(actifs: number, total: number) {
  if (total === 0) return '—';
  return `${Math.round((actifs / total) * 100)} %`;
}

export default function FrequentationDocument({ logo, periodeTexte, institutions }: FrequentationProps) {
  return (
    <Document title="Fréquentation — Traiteur La Pomme Verte" author="Traiteur La Pomme Verte">
      <Page size="LETTER" style={stylesRapport.page} wrap>
        <EnteteRapport logo={logo} sousMarque="Rapport de gestion" periodeTexte={periodeTexte} />
        <Text style={stylesRapport.titre}>Participation des familles inscrites</Text>
        <Text style={stylesRapport.sousTitre}>Parmi les comptes parents actifs chez nous, combien ont commandé au moins une fois dans la période — par école et par niveau</Text>

        {institutions.map((inst) => (
          <View key={inst.institutionId} wrap={false}>
            <Text style={stylesRapport.sectionTitre}>{inst.institutionNom} — {pct(inst.enfantsActifs, inst.totalEnfants)} ({inst.enfantsActifs}/{inst.totalEnfants})</Text>
            <View style={stylesRapport.tableEntete}>
              <Text style={[stylesRapport.tableEnteteTexte, { width: '40%' }]}>Niveau</Text>
              <Text style={[stylesRapport.tableEnteteTexte, { width: '20%', textAlign: 'right' }]}>Comptes</Text>
              <Text style={[stylesRapport.tableEnteteTexte, { width: '20%', textAlign: 'right' }]}>Actifs</Text>
              <Text style={[stylesRapport.tableEnteteTexte, { width: '20%', textAlign: 'right' }]}>Taux</Text>
            </View>
            {inst.parNiveau.map((n) => (
              <View key={n.niveau} style={stylesRapport.tableLigne}>
                <Text style={[stylesRapport.tableTexte, { width: '40%' }]}>{n.niveau}</Text>
                <Text style={[stylesRapport.tableTexteMuted, { width: '20%', textAlign: 'right' }]}>{n.total}</Text>
                <Text style={[stylesRapport.tableTexteMuted, { width: '20%', textAlign: 'right' }]}>{n.actifs}</Text>
                <Text style={[stylesRapport.tableTexteGras, { width: '20%', textAlign: 'right' }]}>{pct(n.actifs, n.total)}</Text>
              </View>
            ))}
          </View>
        ))}

        {institutions.length === 0 && <Text style={stylesRapport.sousTitre}>Aucune donnée pour ce filtre.</Text>}

        <Text style={stylesRapport.piedPage}>
          Calculé à partir des comptes parents actifs chez nous — ne reflète pas nécessairement le registre officiel de chaque école, qui peut compter des élèves sans compte chez nous.
        </Text>
      </Page>
    </Document>
  );
}
