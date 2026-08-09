// lib/pdf/fonts.ts
// Enregistre Nunito (même police que l'app) pour les PDF générés par
// @react-pdf/renderer — fichiers statiques dans public/fonts, lus une
// seule fois par processus.
import path from 'path';
import { Font } from '@react-pdf/renderer';

let enregistre = false;

export function enregistrerPolices() {
  if (enregistre) return;
  const dossier = path.join(process.cwd(), 'public', 'fonts');
  Font.register({
    family: 'Nunito',
    fonts: [
      { src: path.join(dossier, 'Nunito-Regular.ttf'), fontWeight: 400 },
      { src: path.join(dossier, 'Nunito-Bold.ttf'), fontWeight: 700 },
      { src: path.join(dossier, 'Nunito-ExtraBold.ttf'), fontWeight: 800 },
    ],
  });
  enregistre = true;
}
