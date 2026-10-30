// lib/pdf/TardivesDocument.tsx
// Fiche imprimable des commandes tardives d'une journée, UNE PAGE PAR ÉCOLE
// (Christine, 27 octobre 2026) : avant, elles s'ajoutaient à la banque de
// données et il fallait refaire une recherche chaque matin. Ici, un seul
// document à imprimer, prêt à remettre à la cuisine et au comptoir.
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { enregistrerPolices } from './fonts';
import EnteteRapport from './EnteteRapport';
import { stylesRapport, COULEURS, fmtDollars } from './rapportStyles';
import type { PhotoResolue } from './MenuDocument';

enregistrerPolices();

export type EleveTardif = {
  nom: string;
  prenom: string;
  niveau: string;
  allergies: string;
  parent: string;
  telephone: string;
  paiement: string;
  /** Montant des repas tardifs de CE jour pour cet enfant. */
  repas: number;
  /** Ce qui reste à encaisser sur sa commande (0 = déjà payée). */
  aEncaisser: number;
};

export type EcoleTardive = { institutionNom: string; eleves: EleveTardif[] };

const COL = { eleve: '27%', n: '8%', parent: '25%', paiement: '17%', repas: '9%', du: '14%' };

export default function TardivesDocument({
  logo,
  dateTexte,
  ecoles,
}: {
  logo: PhotoResolue;
  dateTexte: string;
  ecoles: EcoleTardive[];
}) {
  return (
    <Document title={`Commandes tardives — ${dateTexte}`} author="Traiteur La Pomme Verte">
      {ecoles.length === 0 && (
        <Page size="LETTER" style={stylesRapport.page}>
          <EnteteRapport logo={logo} sousMarque="Commandes tardives" periodeTexte={dateTexte} />
          <Text style={stylesRapport.titre}>Commandes tardives</Text>
          <Text style={stylesRapport.sousTitre}>Aucune commande tardive pour cette journée.</Text>
        </Page>
      )}
      {ecoles.map((e) => {
        const totalDu = e.eleves.reduce((s, x) => s + x.aEncaisser, 0);
        return (
          <Page key={e.institutionNom} size="LETTER" style={stylesRapport.page} wrap>
            <EnteteRapport logo={logo} sousMarque="Commandes tardives" periodeTexte={dateTexte} />
            <Text style={stylesRapport.titre}>{e.institutionNom}</Text>
            <Text style={stylesRapport.sousTitre}>
              {e.eleves.length} repas tardif{e.eleves.length > 1 ? 's' : ''} à servir — repas au choix du chef
            </Text>

            <View style={stylesRapport.tableEntete} fixed>
              <Text style={[stylesRapport.tableEnteteTexte, { width: COL.eleve }]}>Élève</Text>
              <Text style={[stylesRapport.tableEnteteTexte, { width: COL.n }]}>N</Text>
              <Text style={[stylesRapport.tableEnteteTexte, { width: COL.parent }]}>Parent</Text>
              <Text style={[stylesRapport.tableEnteteTexte, { width: COL.paiement }]}>Paiement</Text>
              <Text style={[stylesRapport.tableEnteteTexte, { width: COL.repas, textAlign: 'right' }]}>Repas</Text>
              <Text style={[stylesRapport.tableEnteteTexte, { width: COL.du, textAlign: 'right' }]}>À encaisser</Text>
            </View>
            {e.eleves.map((x, i) => (
              <View key={i} style={stylesRapport.tableLigne} wrap={false}>
                <View style={{ width: COL.eleve }}>
                  <Text style={stylesRapport.tableTexteGras}>{x.nom}, {x.prenom}</Text>
                  {x.allergies ? <Text style={{ fontSize: 8.5, fontWeight: 800, color: COULEURS.critique }}>Allergie : {x.allergies}</Text> : null}
                </View>
                <Text style={[stylesRapport.tableTexte, { width: COL.n }]}>{x.niveau}</Text>
                <View style={{ width: COL.parent }}>
                  <Text style={stylesRapport.tableTexte}>{x.parent}</Text>
                  {x.telephone ? <Text style={stylesRapport.tableTexteMuted}>{x.telephone}</Text> : null}
                </View>
                <Text style={[stylesRapport.tableTexteMuted, { width: COL.paiement }]}>{x.paiement}</Text>
                <Text style={[stylesRapport.tableTexte, { width: COL.repas, textAlign: 'right' }]}>{fmtDollars(x.repas)}</Text>
                <Text style={[x.aEncaisser > 0 ? stylesRapport.tableTexteGras : stylesRapport.tableTexteMuted, { width: COL.du, textAlign: 'right', color: x.aEncaisser > 0 ? COULEURS.warn : COULEURS.bon }]}>
                  {x.aEncaisser > 0 ? fmtDollars(x.aEncaisser) : 'Payé'}
                </Text>
              </View>
            ))}
            <View style={stylesRapport.tableTotal}>
              <Text style={[stylesRapport.tableTexteGras, { width: '77%' }]}>Total ({e.eleves.length})</Text>
              <Text style={[stylesRapport.tableTexteGras, { width: '9%', textAlign: 'right' }]}>
                {fmtDollars(e.eleves.reduce((s, x) => s + x.repas, 0))}
              </Text>
              <Text style={[stylesRapport.tableTexteGras, { width: '14%', textAlign: 'right' }]}>{fmtDollars(totalDu)}</Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
