// lib/pdf/MenuDocument.tsx
// Version imprimable et brandée d'un menu — pour les parents qui ne
// peuvent pas (ou ne veulent pas) commander en ligne. Reprend le menu
// (mêmes données résolues que la page publique, voir resoudreSelection
// dans lib/menu-logic.ts) PLUS un coupon-réponse à remplir à la main et
// remettre en enveloppe, calqué sur le formulaire papier actuel du
// traiteur (mêmes champs : élève, parent, allergies, paiement).
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { enregistrerPolices } from './fonts';

enregistrerPolices();

const COULEURS = {
  ink: '#16210F',
  inkMuted: '#52623F',
  appleDeep: '#3B8C47',
  leafDeep: '#123512',
  soft: '#F0F5E7',
  line: '#DCE3D1',
  lineForte: '#8FA87A',
  warn: '#B5540C',
};

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Nunito',
    fontSize: 9,
    color: COULEURS.ink,
    backgroundColor: '#FFFFFF',
    padding: 28,
  },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `2 solid ${COULEURS.appleDeep}`,
    paddingBottom: 12,
    marginBottom: 14,
  },
  logo: { width: 40, height: 40, borderRadius: 20 },
  enteteTexte: { marginLeft: 10 },
  marque: { fontSize: 12, fontWeight: 800, color: COULEURS.leafDeep },
  sousMarque: { fontSize: 7.5, color: COULEURS.inkMuted, marginTop: 1 },
  institutionLogo: { width: 36, height: 36, objectFit: 'contain' },
  titreBloc: { marginBottom: 12 },
  titre: { fontSize: 17, fontWeight: 800, color: COULEURS.leafDeep },
  institutionNom: { fontSize: 11, fontWeight: 700, color: COULEURS.appleDeep, marginTop: 2 },
  periode: { fontSize: 8.5, color: COULEURS.inkMuted, marginTop: 3 },
  dateLimite: { fontSize: 8.5, fontWeight: 700, color: COULEURS.warn, marginTop: 2 },

  journee: { marginBottom: 7, padding: 8, backgroundColor: COULEURS.soft, borderRadius: 7 },
  jourLabel: { fontSize: 9, fontWeight: 800, color: COULEURS.ink, marginBottom: 4 },
  selectionRow: { flexDirection: 'row', marginBottom: 4 },
  selectionRowLast: { flexDirection: 'row' },
  photo: { width: 28, height: 28, borderRadius: 5, marginRight: 7, objectFit: 'cover' },
  photoVide: { width: 28, height: 28, borderRadius: 5, marginRight: 7, backgroundColor: COULEURS.line },
  selectionTexte: { flex: 1 },
  repasNom: { fontSize: 8.5, fontWeight: 700 },
  repasDescription: { fontSize: 7.5, color: COULEURS.inkMuted, marginTop: 1 },
  prix: { fontSize: 7.5, color: COULEURS.inkMuted, marginTop: 1.5 },

  decoupe: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  decoupeTrait: { flex: 1, borderTop: `1 dashed ${COULEURS.lineForte}` },
  decoupeTexte: {
    fontSize: 7,
    fontWeight: 800,
    color: COULEURS.appleDeep,
    letterSpacing: 0.5,
    marginHorizontal: 8,
  },

  // Pas de bordure ici volontairement : cette zone peut s'étaler sur
  // plusieurs pages (menus longs) et une bordure qui se referme au
  // milieu d'un saut de page a l'air cassée.
  coupon: {},
  couponTitre: { fontSize: 10, fontWeight: 800, color: COULEURS.leafDeep, marginBottom: 8 },

  semaine: { flexDirection: 'row', marginBottom: 8 },
  jourColonne: { flex: 1, marginRight: 6 },
  jourColonneLast: { flex: 1 },
  jourColHeader: {
    fontSize: 7.5,
    fontWeight: 800,
    color: '#FFFFFF',
    backgroundColor: COULEURS.appleDeep,
    textAlign: 'center',
    paddingVertical: 3,
    borderRadius: 3,
    marginBottom: 3,
  },
  choixLigne: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  radio: { width: 6, height: 6, borderRadius: 3, borderWidth: 0.75, borderColor: COULEURS.ink, marginRight: 4 },
  case: { width: 6, height: 6, borderWidth: 0.75, borderColor: COULEURS.ink, marginRight: 4 },
  choixTexte: { fontSize: 6.8, color: COULEURS.ink, flexShrink: 1 },

  sectionTitre: {
    fontSize: 8.5,
    fontWeight: 800,
    color: COULEURS.leafDeep,
    marginTop: 10,
    marginBottom: 5,
    borderTop: `1 solid ${COULEURS.line}`,
    paddingTop: 8,
  },
  ligneChamps: { flexDirection: 'row', marginBottom: 7 },
  champ: { flex: 1, marginRight: 14 },
  champLast: { flex: 1 },
  champLabel: { fontSize: 7.5, color: COULEURS.inkMuted, marginBottom: 2 },
  champTrait: { borderBottom: `1 solid ${COULEURS.ink}`, height: 12 },

  groupeChoix: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 2 },
  groupeChoixItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 3 },

  piedDePage: { marginTop: 12, paddingTop: 10, borderTop: `1 solid ${COULEURS.line}` },
  piedTitre: { fontSize: 8.5, fontWeight: 800, color: COULEURS.leafDeep, marginBottom: 3 },
  piedLigne: { fontSize: 7.5, color: COULEURS.inkMuted, marginBottom: 1.5 },
  lienLigne: { fontSize: 7.5, color: COULEURS.appleDeep, fontWeight: 700, marginTop: 4 },
});

export type PhotoResolue = { data: Buffer; format: 'jpg' | 'png' } | null;

export type SelectionPdf = {
  id: string;
  nom: string;
  description: string | null;
  photo: PhotoResolue;
  prixPetit: string;
  prixRegulier: string;
  prixDeuxiemeService: string;
};

export type JourneePdf = {
  id: string;
  date: Date;
  jourSemaine: string;
  selections: SelectionPdf[];
};

export type MenuDocumentProps = {
  thematique: string | null;
  periodeDebut: Date;
  periodeFin: Date;
  dateLimiteCommande: Date;
  urlEnLigne: string;
  institution: { nom: string; telephone: string | null; courriel: string | null; logo: PhotoResolue; offreFondation: boolean; offreFormatPetit: boolean };
  logoTraiteur: PhotoResolue;
  journees: JourneePdf[];
};

const fmtDate = (d: Date) => d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' });
const fmtDateCourte = (d: Date) => d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });

/** Regroupe les journées par semaine calendaire (lundi à vendredi), pour le coupon-réponse en colonnes — même patron que le formulaire papier actuel. */
function regrouperParSemaine(journees: JourneePdf[]): JourneePdf[][] {
  const semaines = new Map<string, JourneePdf[]>();
  for (const j of journees) {
    const jourIso = j.date.getUTCDay() || 7;
    const lundi = new Date(Date.UTC(j.date.getUTCFullYear(), j.date.getUTCMonth(), j.date.getUTCDate() - jourIso + 1));
    const cle = lundi.toISOString().slice(0, 10);
    if (!semaines.has(cle)) semaines.set(cle, []);
    semaines.get(cle)!.push(j);
  }
  return Array.from(semaines.values());
}

const NIVEAUX = ['Préscolaire', '1', '2', '3', '4', '5', '6', 'Adulte'];
const ALLERGIES = ['Gluten', 'Lactose', 'Végétarien', 'Autre'];
const MODES_PAIEMENT_BASE = ['Argent comptant', 'Virement Interac', 'Chèque #______', 'Prépayé'];

export default function MenuDocument({
  thematique,
  periodeDebut,
  periodeFin,
  dateLimiteCommande,
  urlEnLigne,
  institution,
  logoTraiteur,
  journees,
}: MenuDocumentProps) {
  const semaines = regrouperParSemaine(journees);
  const modesPaiement = institution.offreFondation ? [...MODES_PAIEMENT_BASE, 'Fondation'] : MODES_PAIEMENT_BASE;

  return (
    <Document
      title={`Menu ${institution.nom}${thematique ? ' — ' + thematique : ''}`}
      author="Traiteur La Pomme Verte"
    >
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.entete}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {logoTraiteur && <Image src={logoTraiteur} style={styles.logo} />}
            <View style={styles.enteteTexte}>
              <Text style={styles.marque}>Traiteur La Pomme Verte</Text>
              <Text style={styles.sousMarque}>Menu scolaire</Text>
            </View>
          </View>
          {institution.logo && <Image src={institution.logo} style={styles.institutionLogo} />}
        </View>

        <View style={styles.titreBloc}>
          <Text style={styles.titre}>{thematique || 'Menu'}</Text>
          <Text style={styles.institutionNom}>{institution.nom}</Text>
          <Text style={styles.periode}>Du {fmtDate(periodeDebut)} au {fmtDate(periodeFin)}</Text>
          <Text style={styles.dateLimite}>Date limite de commande : {fmtDate(dateLimiteCommande)}</Text>
        </View>

        {journees.map((j) => (
          <View key={j.id} style={styles.journee} wrap={false}>
            <Text style={styles.jourLabel}>{j.jourSemaine} {fmtDateCourte(j.date)}</Text>
            {j.selections.map((s, idx) => (
              <View key={s.id} style={idx === j.selections.length - 1 ? styles.selectionRowLast : styles.selectionRow}>
                {s.photo ? <Image src={s.photo} style={styles.photo} /> : <View style={styles.photoVide} />}
                <View style={styles.selectionTexte}>
                  <Text style={styles.repasNom}>{s.nom}</Text>
                  {s.description && <Text style={styles.repasDescription}>{s.description}</Text>}
                  <Text style={styles.prix}>
                    {institution.offreFormatPetit ? `Petit repas ${s.prixPetit}$ · ` : ''}
                    Repas régulier {s.prixRegulier}$ · Repas + 2e service {s.prixDeuxiemeService}$
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.decoupe} wrap={false}>
          <View style={styles.decoupeTrait} />
          <Text style={styles.decoupeTexte}>COUPON-RÉPONSE À RETOURNER</Text>
          <View style={styles.decoupeTrait} />
        </View>

        <View style={styles.coupon}>
          <Text style={styles.couponTitre}>Cocher les repas choisis, pour chaque journée</Text>

          {semaines.map((semaine, i) => (
            <View key={i} style={styles.semaine} wrap={false}>
              {semaine.map((j, idx) => (
                <View key={j.id} style={idx === semaine.length - 1 ? styles.jourColonneLast : styles.jourColonne}>
                  <Text style={styles.jourColHeader}>{j.jourSemaine.slice(0, 3)} {fmtDateCourte(j.date)}</Text>
                  {institution.offreFormatPetit && (
                    <View style={styles.choixLigne}><View style={styles.radio} /><Text style={styles.choixTexte}>Petit repas</Text></View>
                  )}
                  <View style={styles.choixLigne}><View style={styles.radio} /><Text style={styles.choixTexte}>Repas régulier</Text></View>
                  <View style={styles.choixLigne}><View style={styles.radio} /><Text style={styles.choixTexte}>Repas + 2e serv.</Text></View>
                  {j.selections.map((s) => (
                    <View key={s.id} style={styles.choixLigne}>
                      <View style={styles.case} />
                      <Text style={styles.choixTexte}>{s.nom}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ))}

          <View style={styles.ligneChamps}>
            <View style={styles.champ}><Text style={styles.champLabel}>Quantité</Text><View style={styles.champTrait} /></View>
            <View style={styles.champ}><Text style={styles.champLabel}>Crédit</Text><View style={styles.champTrait} /></View>
            <View style={styles.champLast}><Text style={styles.champLabel}>Total</Text><View style={styles.champTrait} /></View>
          </View>

          <Text style={styles.sectionTitre}>Paiement</Text>
          <View style={styles.groupeChoix}>
            {modesPaiement.map((m) => (
              <View key={m} style={styles.groupeChoixItem}><View style={styles.radio} /><Text style={styles.choixTexte}>{m}</Text></View>
            ))}
          </View>

          <Text style={styles.sectionTitre}>Information de l'élève</Text>
          <View style={styles.ligneChamps}>
            <View style={styles.champ}><Text style={styles.champLabel}>Nom de famille</Text><View style={styles.champTrait} /></View>
            <View style={styles.champLast}><Text style={styles.champLabel}>Prénom</Text><View style={styles.champTrait} /></View>
          </View>
          <Text style={styles.champLabel}>Niveau</Text>
          <View style={styles.groupeChoix}>
            {NIVEAUX.map((n) => (
              <View key={n} style={styles.groupeChoixItem}><View style={styles.radio} /><Text style={styles.choixTexte}>{n}</Text></View>
            ))}
          </View>
          <Text style={styles.champLabel}>Intolérance / allergie</Text>
          <View style={styles.groupeChoix}>
            {ALLERGIES.map((a) => (
              <View key={a} style={styles.groupeChoixItem}><View style={styles.case} /><Text style={styles.choixTexte}>{a}</Text></View>
            ))}
          </View>

          <Text style={styles.sectionTitre}>Information du parent</Text>
          <View style={styles.ligneChamps}>
            <View style={styles.champ}><Text style={styles.champLabel}>Nom</Text><View style={styles.champTrait} /></View>
            <View style={styles.champ}><Text style={styles.champLabel}>Téléphone</Text><View style={styles.champTrait} /></View>
            <View style={styles.champLast}><Text style={styles.champLabel}>Courriel</Text><View style={styles.champTrait} /></View>
          </View>
        </View>

        <View style={styles.piedDePage}>
          <Text style={styles.piedTitre}>Pour commander</Text>
          {institution.telephone && <Text style={styles.piedLigne}>Téléphone : {institution.telephone}</Text>}
          {institution.courriel && <Text style={styles.piedLigne}>Courriel : {institution.courriel}</Text>}
          <Text style={styles.lienLigne}>Commander en ligne : {urlEnLigne}</Text>
        </View>
      </Page>
    </Document>
  );
}
