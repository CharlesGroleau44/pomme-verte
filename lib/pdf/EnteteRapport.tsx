// lib/pdf/EnteteRapport.tsx
// Bandeau d'en-tête commun aux 6 rapports de gestion — logo, nom du
// document, période/filtre affichés en clair (Christine doit pouvoir
// identifier un PDF imprimé sans rouvrir l'admin).
import { View, Text, Image } from '@react-pdf/renderer';
import { stylesRapport } from './rapportStyles';
import type { PhotoResolue } from './MenuDocument';

export default function EnteteRapport({
  logo,
  sousMarque,
  periodeTexte,
}: {
  logo: PhotoResolue;
  sousMarque: string;
  periodeTexte: string;
}) {
  return (
    <View style={stylesRapport.entete}>
      <View style={stylesRapport.enteteGauche}>
        {logo && <Image src={logo} style={stylesRapport.logo} />}
        <View>
          <Text style={stylesRapport.marque}>Traiteur La Pomme Verte</Text>
          <Text style={stylesRapport.sousMarque}>{sousMarque}</Text>
        </View>
      </View>
      <Text style={stylesRapport.periode}>{periodeTexte}</Text>
    </View>
  );
}
