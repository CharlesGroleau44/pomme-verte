// lib/pdf/GuideCommandeDocument.tsx
// Guide « mini marche à suivre » pour les parents — demandé par Christine
// (courriel du 17 août 2026) pour que ses secrétaires puissent joindre un
// vrai PDF à leur courriel, comme elles en ont l'habitude, plutôt qu'un
// simple lien. Contenu générique (pas de données de menu) : un seul
// rendu sert à toutes les écoles.
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
  blush: '#E8A0A0',
  blushDeep: '#D9717A',
};

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Nunito',
    fontSize: 10,
    color: COULEURS.ink,
    backgroundColor: '#FFFFFF',
    padding: 34,
  },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottom: `2 solid ${COULEURS.appleDeep}`,
    paddingBottom: 12,
    marginBottom: 16,
  },
  logo: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  marque: { fontSize: 14, fontWeight: 800, color: COULEURS.leafDeep },
  sousMarque: { fontSize: 9, fontWeight: 400, color: COULEURS.inkMuted },

  titre: { fontSize: 20, fontWeight: 800, color: COULEURS.leafDeep, marginBottom: 4 },
  soustitre: { fontSize: 11, color: COULEURS.inkMuted, marginBottom: 20, lineHeight: 1.4 },

  etape: { flexDirection: 'row', marginBottom: 16 },
  numeroCercle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COULEURS.appleDeep,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  numeroTexte: { color: '#FFFFFF', fontSize: 12, fontWeight: 800 },
  etapeContenu: { flex: 1, paddingTop: 2 },
  etapeTitre: { fontSize: 12, fontWeight: 700, color: COULEURS.ink, marginBottom: 2 },
  etapeTexte: { fontSize: 9.5, color: COULEURS.inkMuted, lineHeight: 1.4 },

  encadre: {
    backgroundColor: COULEURS.soft,
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Pas d'émoji ici : la police Nunito embarquée n'a pas de glyphes
  // couleur et react-pdf les rend cassés/mal positionnés — un simple
  // rond de couleur porte la même idée sans ce risque.
  encadrePastille: { width: 10, height: 10, borderRadius: 5, backgroundColor: COULEURS.appleDeep, marginRight: 10 },
  encadreTexte: { fontSize: 10.5, fontWeight: 800, color: COULEURS.leafDeep },
  encadreSousTexte: { fontSize: 9, color: COULEURS.inkMuted, marginTop: 1 },

  lienBloc: {
    backgroundColor: COULEURS.appleDeep,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  lienLabel: { fontSize: 9, color: '#FFFFFF', opacity: 0.85, marginBottom: 3 },
  lienTexte: { fontSize: 13, fontWeight: 800, color: '#FFFFFF' },

  piedDePage: { marginTop: 24, paddingTop: 10, borderTop: `1 solid ${COULEURS.line}` },
  piedTexte: { fontSize: 8, color: COULEURS.inkMuted, textAlign: 'center' },
});

export type LogoPdf = { data: Buffer; format: 'jpg' | 'png' } | null;

export default function GuideCommandeDocument({ logo }: { logo: LogoPdf }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.entete}>
          {logo && <Image src={logo} style={styles.logo} />}
          <View>
            <Text style={styles.marque}>Traiteur La Pomme Verte</Text>
            <Text style={styles.sousMarque}>Commande de repas scolaires en ligne</Text>
          </View>
        </View>

        <Text style={styles.titre}>Comment commander vos repas en ligne</Text>
        <Text style={styles.soustitre}>
          Cinq étapes, quelques minutes — voici la marche à suivre pour commander les repas de votre enfant.
        </Text>

        <View style={styles.etape}>
          <View style={styles.numeroCercle}><Text style={styles.numeroTexte}>1</Text></View>
          <View style={styles.etapeContenu}>
            <Text style={styles.etapeTitre}>Allez sur le site</Text>
            <Text style={styles.etapeTexte}>Rendez-vous sur menus.traiteurlapommeverte.com et choisissez l&apos;école de votre enfant.</Text>
          </View>
        </View>

        <View style={styles.etape}>
          <View style={styles.numeroCercle}><Text style={styles.numeroTexte}>2</Text></View>
          <View style={styles.etapeContenu}>
            <Text style={styles.etapeTitre}>Créez votre compte</Text>
            <Text style={styles.etapeTexte}>Votre nom, votre courriel, un mot de passe, et les informations de votre enfant (école, niveau, allergies). Une seule fois — vos renseignements restent enregistrés pour toutes vos prochaines commandes.</Text>
          </View>
        </View>

        <View style={styles.encadre}>
          <View style={styles.encadrePastille} />
          <View>
            <Text style={styles.encadreTexte}>Créer un compte : facile, 2 minutes !</Text>
            <Text style={styles.encadreSousTexte}>Gratuit, et vos informations restent enregistrées pour la prochaine fois.</Text>
          </View>
        </View>

        <View style={styles.etape}>
          <View style={styles.numeroCercle}><Text style={styles.numeroTexte}>3</Text></View>
          <View style={styles.etapeContenu}>
            <Text style={styles.etapeTitre}>Choisissez le menu et les repas</Text>
            <Text style={styles.etapeTexte}>Cochez les journées désirées et le format (régulier ou portion+) pour chaque repas.</Text>
          </View>
        </View>

        <View style={styles.etape}>
          <View style={styles.numeroCercle}><Text style={styles.numeroTexte}>4</Text></View>
          <View style={styles.etapeContenu}>
            <Text style={styles.etapeTitre}>Choisissez votre mode de paiement</Text>
            <Text style={styles.etapeTexte}>Argent comptant, chèque, virement Interac — ou profitez de l&apos;entente annuelle ou du solde prépayé pour ne plus jamais payer à chaque commande.</Text>
          </View>
        </View>

        <View style={styles.etape}>
          <View style={styles.numeroCercle}><Text style={styles.numeroTexte}>5</Text></View>
          <View style={styles.etapeContenu}>
            <Text style={styles.etapeTitre}>Envoyez votre commande</Text>
            <Text style={styles.etapeTexte}>Vous recevez une confirmation par courriel immédiatement. Vous pouvez modifier ou annuler votre commande jusqu&apos;à la date limite indiquée sur le menu.</Text>
          </View>
        </View>

        <View style={styles.lienBloc}>
          <Text style={styles.lienLabel}>Commencez dès maintenant</Text>
          <Text style={styles.lienTexte}>menus.traiteurlapommeverte.com</Text>
        </View>

        <View style={styles.piedDePage}>
          <Text style={styles.piedTexte}>Une question? Écrivez-nous — nous sommes là pour vous aider.</Text>
        </View>
      </Page>
    </Document>
  );
}
