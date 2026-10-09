// lib/normalisation.ts
// Normalisation de nom d'élève partagée entre lib/registre-eleves.ts (import
// du registre) et lib/classeur-commandes.ts (fusion registre + commandes
// réelles dans la feuille Cuisine) — un seul endroit pour cette règle,
// jamais deux implémentations qui pourraient diverger.
//
// Deux correctifs demandés par Christine (courriel du 7 septembre 2026) :
//
// 1. « Enlever les accents, ceux-ci créent des doublons » — un même élève
//    épelé différemment d'un import à l'autre (accents oubliés/ajoutés par
//    l'école, ou entre le nom que le parent tape à l'inscription et celui
//    du registre officiel) ne doit jamais être traité comme deux personnes.
//    Les accents sont retirés à la fois du texte STOCKÉ (import) et de la
//    clé de comparaison (cleEleve), pour que les deux se rejoignent toujours.
//
// 2. Le niveau fait partie de la clé de correspondance — pas seulement
//    nom+prénom — depuis le cas réel de Jacob Roux à Brassard-Saint-Patrice :
//    deux élèves distincts, même nom, un en préscolaire et un en 5e année.
//    Sans le niveau, le second écrasait silencieusement le premier à chaque
//    import (voir remplacerRegistre) et les deux se confondaient dans la
//    feuille Cuisine (voir construireClasseurCommandes).
export function retirerAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function cleEleve(nom: string, prenom: string, niveau: string): string {
  return [nom, prenom, niveau]
    .map((v) => retirerAccents(v.trim().toLowerCase()))
    .join('|');
}
