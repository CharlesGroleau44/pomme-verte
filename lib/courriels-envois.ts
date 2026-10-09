// lib/courriels-envois.ts
// Le CONTENU de chaque courriel transactionnel, au même endroit — les
// routes n'ont qu'à appeler la bonne fonction. Chaque fonction recharge
// elle-même ce dont elle a besoin en base : la route reste lisible, et
// un oubli d'`include` ne peut pas casser un courriel.
//
// Règle absolue : aucune de ces fonctions ne doit faire échouer l'action
// du parent. envoyerCourriel() n'échoue jamais, et les erreurs de
// chargement sont avalées ici — une commande enregistrée reste
// enregistrée même si son accusé de réception ne part pas.
import { prisma } from './prisma';
import { envoyerCourriel, bouton, encadre, destinatairesAvis, SITE_URL } from './courriel';
import { jourDuMoisUTC } from './menu-logic';

const LABEL_TAILLE: Record<string, string> = {
  PETIT: 'Petit repas',
  REGULIER: 'Repas régulier',
  DEUXIEME_SERVICE: 'Portion +',
};

const LABEL_PAIEMENT: Record<string, string> = {
  ARGENT: 'Argent comptant',
  VIREMENT_INTERAC: 'Virement Interac',
  CHEQUE: 'Chèque',
  PAYPAL: 'Paypal',
  PREPAYE: 'Entente annuelle',
  SOLDE_PREPAYE: 'Solde prépayé',
  FONDATION: 'Fondation',
};

// Question et réponse de sécurité du virement Interac — identiques pour
// toutes les écoles (Christine, courriel du 11 août 2026 : « tous la même
// question et tous la même réponse »), reprises telles quelles du
// prospectus papier. Le DESTINATAIRE, lui, change d'une école à l'autre :
// c'est la boîte de l'école (Institution.courriel), qui reçoit à la fois
// ses commandes et ses virements.
const INTERAC_QUESTION = 'La couleur des pommes ?';
const INTERAC_REPONSE = 'vertes';

const fmtDate = (d: Date) => d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' });

// ------------------------------------------------------------------
// 1. Réinitialisation de mot de passe
// ------------------------------------------------------------------
export async function envoyerReinitialisation(params: { a: string; nom: string; lien: string }) {
  const { a, nom, lien } = params;
  await envoyerCourriel({
    a,
    sujet: 'Réinitialisation de votre mot de passe',
    texte:
      `Bonjour ${nom},\n\n` +
      `Pour choisir un nouveau mot de passe, ouvrez ce lien (valide 1 heure) :\n${lien}\n\n` +
      `Si vous n'avez pas demandé cette réinitialisation, ignorez simplement ce courriel — votre mot de passe actuel reste valide.`,
    html:
      `<p style="font-size:15px; line-height:1.6; color:#222222;">Bonjour ${nom},</p>
       <p style="font-size:15px; line-height:1.6; color:#222222;">Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.</p>
       ${bouton('Choisir un nouveau mot de passe', lien)}
       <p style="font-size:14px; line-height:1.6; color:#666666; text-align:center;">Ce lien est valide pendant <strong>1 heure</strong>.</p>
       <p style="font-size:14.5px; line-height:1.6; color:#222222;">Si vous n'avez pas fait cette demande, ignorez simplement ce courriel — votre mot de passe actuel reste valide.</p>`,
  });
}

// ------------------------------------------------------------------
// 2. Nouvelle commande : accusé au parent (l'avis à l'école est maintenant
// groupé en un digest quotidien — voir envoyerDigestCommandesInstitution
// et /api/taches/digest-commandes, demandé par Christine le 16 août 2026 :
// « 51 courriels en 1 »).
// ------------------------------------------------------------------
async function chargerCommande(commandeId: string) {
  return prisma.commande.findUnique({
    where: { id: commandeId },
    include: {
      compteParent: true,
      enfant: { include: { institution: true } },
      menu: { include: { thematiqueRef: true } },
      lignes: {
        include: { journee: true, selection: { include: { repas: true } } },
        orderBy: { journee: { date: 'asc' } },
      },
    },
  });
}

export async function envoyerCourrielsNouvelleCommande(commandeId: string) {
  try {
    const c = await chargerCommande(commandeId);
    if (!c) return;

    const thematique = c.menu.thematiqueRef?.nom ?? 'Menu';
    const total = c.lignes.reduce((s, l) => {
      const prix =
        l.prixOverride != null ? l.prixOverride
        : l.taille === 'PETIT' ? (l.selection.prixPetitOverride ?? l.selection.repas.prixPetit)
        : l.taille === 'DEUXIEME_SERVICE' ? (l.selection.prixDeuxiemeServiceOverride ?? l.selection.repas.prixDeuxiemeService)
        : (l.selection.prixRegulierOverride ?? l.selection.repas.prixRegulier);
      return s + Number(prix);
    }, 0);

    const lignesTexte = c.lignes
      .map((l) => {
        const nom = l.selection.nomOverride ?? l.selection.repas.nom;
        return `  • ${l.journee.jourSemaine} ${jourDuMoisUTC(l.journee.date)} — ${nom} (${LABEL_TAILLE[l.taille]})`;
      })
      .join('\n');

    const lignesHtml = c.lignes
      .map((l) => {
        const nom = l.selection.nomOverride ?? l.selection.repas.nom;
        return `<tr>
          <td style="padding:8px 10px; border-bottom:1px solid #EEEEE6; font-size:14px; color:#222222; white-space:nowrap;"><strong>${l.journee.jourSemaine} ${jourDuMoisUTC(l.journee.date)}</strong></td>
          <td style="padding:8px 10px; border-bottom:1px solid #EEEEE6; font-size:14px; color:#222222;">${nom}</td>
          <td style="padding:8px 10px; border-bottom:1px solid #EEEEE6; font-size:13px; color:#666666; white-space:nowrap;">${LABEL_TAILLE[l.taille]}</td>
        </tr>`;
      })
      .join('');

    const enfantNom = `${c.enfant.prenom} ${c.enfant.nomDeFamille}`;
    const paiement = LABEL_PAIEMENT[c.modePaiement] ?? c.modePaiement;
    const lienMenu = `${SITE_URL}/menus/${c.enfant.institutionId}/${c.menuId}`;

    // Un parent qui choisit Interac n'a autrement aucune idée d'où envoyer
    // son virement — on lui donne l'adresse de SON école, plus la question
    // et la réponse, au moment exact où il en a besoin.
    const interac = c.modePaiement === 'VIREMENT_INTERAC' && c.enfant.institution.courriel;
    const interacTexte = interac
      ? `\n\nVotre virement Interac :\n` +
        `  Destinataire : ${c.enfant.institution.courriel}\n` +
        `  Question : ${INTERAC_QUESTION}\n` +
        `  Réponse : ${INTERAC_REPONSE}\n` +
        `  Montant : ${total.toFixed(2)} $`
      : '';
    const interacHtml = interac
      ? encadre(
          `<strong>Votre virement Interac</strong><br>` +
          `Destinataire : <strong>${c.enfant.institution.courriel}</strong><br>` +
          `Question : ${INTERAC_QUESTION}<br>` +
          `Réponse : <strong>${INTERAC_REPONSE}</strong><br>` +
          `Montant : <strong>${total.toFixed(2)} $</strong>`
        )
      : '';

    // --- Accusé au parent ---
    await envoyerCourriel({
      a: c.compteParent.courriel,
      // Une réponse concerne cette école précise, pas la boîte centrale
      // (voir Courriel.repondreA dans lib/courriel.ts).
      repondreA: c.enfant.institution.courriel,
      sujet: `Commande confirmée — ${enfantNom}`,
      texte:
        `Bonjour ${c.compteParent.nom},\n\n` +
        `Nous avons bien reçu la commande de ${enfantNom} (${c.enfant.institution.nom}) pour le menu « ${thematique} ».\n\n` +
        `${lignesTexte}\n\n` +
        `Total : ${total.toFixed(2)} $\nMode de paiement : ${paiement}` +
        `${interacTexte}\n\n` +
        `Vous pouvez modifier ou annuler cette commande jusqu'au ${fmtDate(c.menu.dateLimiteCommande)} inclusivement :\n${lienMenu}`,
      html:
        `<p style="font-size:15px; line-height:1.6; color:#222222;">Bonjour ${c.compteParent.nom},</p>
         <p style="font-size:15px; line-height:1.6; color:#222222;">Nous avons bien reçu la commande de <strong>${enfantNom}</strong> (${c.enfant.institution.nom}) pour le menu « <strong>${thematique}</strong> ».</p>
         <table style="width:100%; border-collapse:collapse; margin:20px 0;">${lignesHtml}</table>
         ${encadre(`<strong>Total : ${total.toFixed(2)} $</strong><br>Mode de paiement : ${paiement}`)}
         ${interacHtml}
         <p style="font-size:15px; line-height:1.6; color:#222222;">Vous pouvez modifier ou annuler cette commande jusqu'au <strong>${fmtDate(c.menu.dateLimiteCommande)}</strong> inclusivement.</p>
         ${bouton('Voir le menu', lienMenu)}`,
    });
  } catch (err) {
    console.error('[courriel] nouvelle commande — échec de préparation :', err);
  }
}

// ------------------------------------------------------------------
// 3. Digest quotidien des commandes à l'école — un seul courriel qui
// liste toutes les commandes reçues depuis le dernier envoi, plutôt qu'un
// avis par commande (voir /api/taches/digest-commandes). commandeIds est
// déjà filtré et groupé par institution par l'appelant — cette fonction
// se contente de composer et d'envoyer.
// ------------------------------------------------------------------
export async function envoyerDigestCommandesInstitution(institutionNom: string, institutionCourriel: string | null, commandeIds: string[]) {
  try {
    const commandes = await prisma.commande.findMany({
      where: { id: { in: commandeIds } },
      include: {
        compteParent: true,
        enfant: true,
        menu: { include: { thematiqueRef: true } },
        lignes: { include: { selection: { include: { repas: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (commandes.length === 0) return;

    const total = (c: (typeof commandes)[number]) =>
      c.lignes.reduce((s, l) => {
        const prix =
          l.prixOverride != null ? l.prixOverride
          : l.taille === 'PETIT' ? (l.selection.prixPetitOverride ?? l.selection.repas.prixPetit)
          : l.taille === 'DEUXIEME_SERVICE' ? (l.selection.prixDeuxiemeServiceOverride ?? l.selection.repas.prixDeuxiemeService)
          : (l.selection.prixRegulierOverride ?? l.selection.repas.prixRegulier);
        return s + Number(prix);
      }, 0);

    const ligneTexte = (c: (typeof commandes)[number]) =>
      `  • ${c.enfant.prenom} ${c.enfant.nomDeFamille} (${c.enfant.niveau}) — ` +
      `${c.menu.thematiqueRef?.nom ?? 'Menu'}, ${c.lignes.length} journée${c.lignes.length > 1 ? 's' : ''}, ` +
      `${total(c).toFixed(2)} $, ${LABEL_PAIEMENT[c.modePaiement] ?? c.modePaiement} — ${c.compteParent.nom}`;

    const ligneHtml = (c: (typeof commandes)[number]) =>
      `<tr>
        <td style="padding:8px 10px; border-bottom:1px solid #EEEEE6; font-size:14px; color:#222222;"><strong>${c.enfant.prenom} ${c.enfant.nomDeFamille}</strong><br><span style="color:#666666; font-size:12.5px;">${c.enfant.niveau}</span></td>
        <td style="padding:8px 10px; border-bottom:1px solid #EEEEE6; font-size:14px; color:#222222;">${c.menu.thematiqueRef?.nom ?? 'Menu'}<br><span style="color:#666666; font-size:12.5px;">${c.lignes.length} journée${c.lignes.length > 1 ? 's' : ''}</span></td>
        <td style="padding:8px 10px; border-bottom:1px solid #EEEEE6; font-size:14px; color:#222222; white-space:nowrap;">${total(c).toFixed(2)} $<br><span style="color:#666666; font-size:12.5px;">${LABEL_PAIEMENT[c.modePaiement] ?? c.modePaiement}</span></td>
        <td style="padding:8px 10px; border-bottom:1px solid #EEEEE6; font-size:13px; color:#666666;">${c.compteParent.nom}</td>
      </tr>`;

    const totalJour = commandes.reduce((s, c) => s + total(c), 0);

    await envoyerCourriel({
      ...destinatairesAvis(institutionCourriel),
      sujet: `${commandes.length} commande${commandes.length > 1 ? 's' : ''} reçue${commandes.length > 1 ? 's' : ''} — ${institutionNom}`,
      texte:
        `Résumé des commandes reçues pour ${institutionNom} :\n\n` +
        commandes.map(ligneTexte).join('\n') +
        `\n\nTotal : ${totalJour.toFixed(2)} $ (${commandes.length} commande${commandes.length > 1 ? 's' : ''})\n\n` +
        `Voir dans la console : ${SITE_URL}/admin/commandes`,
      html:
        `<p style="font-size:15px; line-height:1.6; color:#222222;"><strong>${commandes.length}</strong> commande${commandes.length > 1 ? 's' : ''} reçue${commandes.length > 1 ? 's' : ''} pour <strong>${institutionNom}</strong>.</p>
         <table style="width:100%; border-collapse:collapse; margin:16px 0;">${commandes.map(ligneHtml).join('')}</table>
         ${encadre(`<strong>Total : ${totalJour.toFixed(2)} $</strong>`)}
         ${bouton('Voir dans la console', `${SITE_URL}/admin/commandes`)}`,
    });
  } catch (err) {
    console.error('[courriel] digest commandes — échec de préparation :', err);
  }
}

// ------------------------------------------------------------------
// 4. Bienvenue à la création de compte
// ------------------------------------------------------------------
export async function envoyerBienvenueParent(params: { a: string; nom: string }) {
  const { a, nom } = params;
  await envoyerCourriel({
    a,
    sujet: 'Bienvenue — votre compte est créé',
    texte:
      `Bonjour ${nom},\n\n` +
      `Votre compte Traiteur La Pomme Verte est créé.\n\n` +
      `Ce que ça vous donne :\n` +
      `  • Vos enfants restent enregistrés — plus rien à retaper\n` +
      `  • Votre mode de paiement préféré est mémorisé\n` +
      `  • Tout votre historique de commandes au même endroit\n\n` +
      `Votre espace : ${SITE_URL}/parent/compte`,
    html:
      `<p style="font-size:15px; line-height:1.6; color:#222222;">Bonjour ${nom},</p>
       <p style="font-size:15px; line-height:1.6; color:#222222;">Votre compte est créé. À partir de maintenant, commander prend quelques secondes.</p>
       ${encadre(
         `⚡ Vos enfants restent enregistrés — plus rien à retaper<br>` +
         `💳 Votre mode de paiement préféré est mémorisé<br>` +
         `🧾 Tout votre historique de commandes au même endroit`
       )}
       ${bouton('Accéder à mon compte', `${SITE_URL}/parent/compte`)}`,
  });
}

// ------------------------------------------------------------------
// 4b. Bienvenue à un compte ouvert par Christine (voir POST
// /api/admin/parents) — demandé le 17 août 2026 pour les parents qui
// paient directement (comptant, chèque) et « disparaissent » sans jamais
// créer leur propre compte. Le mot de passe est aléatoire et inutilisable :
// ce courriel EST l'unique façon d'accéder au compte, d'où un lien valide
// 30 jours plutôt que l'heure habituelle d'une simple réinitialisation.
// ------------------------------------------------------------------
export async function envoyerBienvenueCompteAdmin(params: { a: string; nom: string; lien: string; formuleActivee: string | null }) {
  const { a, nom, lien, formuleActivee } = params;
  const ligneFormule = formuleActivee
    ? `Votre mode de paiement « ${formuleActivee} » est déjà activé sur ce compte.`
    : `Votre compte est prêt — aucun mode de paiement particulier n'y est activé pour l'instant.`;
  await envoyerCourriel({
    a,
    sujet: 'Votre compte Traiteur La Pomme Verte est prêt',
    texte:
      `Bonjour ${nom},\n\n` +
      `Nous avons ouvert votre compte Traiteur La Pomme Verte. ${ligneFormule}\n\n` +
      `Pour y accéder, choisissez votre mot de passe ici (lien valide 30 jours) :\n${lien}\n\n` +
      `Une fois connecté·e, vos enfants sont déjà enregistrés et vous pouvez commander directement.`,
    html:
      `<p style="font-size:15px; line-height:1.6; color:#222222;">Bonjour ${nom},</p>
       <p style="font-size:15px; line-height:1.6; color:#222222;">Nous avons ouvert votre compte Traiteur La Pomme Verte.</p>
       ${encadre(ligneFormule)}
       <p style="font-size:15px; line-height:1.6; color:#222222;">Pour y accéder, choisissez votre mot de passe ci-dessous.</p>
       ${bouton('Choisir mon mot de passe', lien)}
       <p style="font-size:14px; line-height:1.6; color:#666666; text-align:center;">Ce lien est valide pendant <strong>30 jours</strong>.</p>`,
  });
}

// ------------------------------------------------------------------
// 5. Annulation de commande
// ------------------------------------------------------------------
export async function envoyerCourrielsAnnulation(params: {
  courrielParent: string;
  nomParent: string;
  enfantNom: string;
  institutionNom: string;
  /** Boîte de l'école — l'annulation la concerne autant que la commande. */
  institutionCourriel: string | null;
  thematique: string;
}) {
  const { courrielParent, nomParent, enfantNom, institutionNom, institutionCourriel, thematique } = params;

  await envoyerCourriel({
    a: courrielParent,
    repondreA: institutionCourriel,
    sujet: `Commande annulée — ${enfantNom}`,
    texte:
      `Bonjour ${nomParent},\n\n` +
      `La commande de ${enfantNom} (${institutionNom}) pour le menu « ${thematique} » a bien été annulée.\n\n` +
      `Rien ne sera préparé ni facturé pour ces journées. Vous pouvez recommander en tout temps tant que la date limite n'est pas passée :\n${SITE_URL}/menus`,
    html:
      `<p style="font-size:15px; line-height:1.6; color:#222222;">Bonjour ${nomParent},</p>
       <p style="font-size:15px; line-height:1.6; color:#222222;">La commande de <strong>${enfantNom}</strong> (${institutionNom}) pour le menu « <strong>${thematique}</strong> » a bien été annulée.</p>
       ${encadre('Rien ne sera préparé ni facturé pour ces journées.')}
       <p style="font-size:15px; line-height:1.6; color:#222222;">Vous pouvez commander de nouveau en tout temps, tant que la date limite n'est pas passée.</p>
       ${bouton('Voir les menus', `${SITE_URL}/menus`)}`,
  });

  // Même routage que l'avis de nouvelle commande (voir destinatairesAvis).
  await envoyerCourriel({
    ...destinatairesAvis(institutionCourriel),
    sujet: `Commande annulée — ${enfantNom} (${institutionNom})`,
    texte:
      `Une commande vient d'être annulée par le parent.\n\n` +
      `Élève : ${enfantNom}\nÉcole : ${institutionNom}\nMenu : ${thematique}\nParent : ${nomParent} — ${courrielParent}\n\n` +
      `Console : ${SITE_URL}/admin/commandes`,
    html:
      `<p style="font-size:15px; line-height:1.6; color:#222222;">Une commande vient d'être annulée par le parent.</p>
       ${encadre(`<strong>${enfantNom}</strong><br>${institutionNom} — ${thematique}<br>${nomParent} — ${courrielParent}`)}
       ${bouton('Voir dans la console', `${SITE_URL}/admin/commandes`)}`,
  });
}

// ------------------------------------------------------------------
// 6. Rappel de date limite
// ------------------------------------------------------------------
export async function envoyerRappelDateLimite(params: {
  a: string;
  nom: string;
  thematique: string;
  institutionNom: string;
  institutionCourriel: string | null;
  dateLimite: Date;
  lienMenu: string;
}) {
  const { a, nom, thematique, institutionNom, institutionCourriel, dateLimite, lienMenu } = params;
  await envoyerCourriel({
    a,
    repondreA: institutionCourriel,
    sujet: `Dernière chance de commander — ${thematique}`,
    texte:
      `Bonjour ${nom},\n\n` +
      `La date limite pour commander le menu « ${thematique} » (${institutionNom}) est demain, le ${fmtDate(dateLimite)}.\n\n` +
      `Si vous souhaitez commander, c'est le moment :\n${lienMenu}\n\n` +
      `Si vous ne comptiez pas commander cette fois-ci, ignorez simplement ce message.`,
    html:
      `<p style="font-size:15px; line-height:1.6; color:#222222;">Bonjour ${nom},</p>
       <p style="font-size:15px; line-height:1.6; color:#222222;">La date limite pour commander le menu « <strong>${thematique}</strong> » (${institutionNom}) est <strong>demain, le ${fmtDate(dateLimite)}</strong>.</p>
       ${bouton('Commander maintenant', lienMenu)}
       <p style="font-size:14.5px; line-height:1.6; color:#666666;">Si vous ne comptiez pas commander cette fois-ci, ignorez simplement ce message.</p>`,
  });
}

// ------------------------------------------------------------------
// 7. Rappel du 2e versement de l'entente annuelle
// ------------------------------------------------------------------
export async function envoyerRappelVersementEntente(params: {
  a: string; nom: string; enfantNom: string; institutionCourriel: string | null; montant: number; dateEcheance: Date; enRetard: boolean;
}) {
  const { a, nom, enfantNom, institutionCourriel, montant, dateEcheance, enRetard } = params;
  const sujet = enRetard
    ? `Votre 2e versement pour ${enfantNom} — en retard depuis le ${fmtDate(dateEcheance)}`
    : `Rappel — votre 2e versement pour ${enfantNom} est à venir`;
  await envoyerCourriel({
    a,
    repondreA: institutionCourriel,
    sujet,
    texte:
      `Bonjour ${nom},\n\n` +
      (enRetard
        ? `Le 2e versement de l'entente annuelle de ${enfantNom} (${montant.toFixed(2)} $) était dû le ${fmtDate(dateEcheance)}.\n\n`
        : `Le 2e versement de l'entente annuelle de ${enfantNom} (${montant.toFixed(2)} $) est prévu pour le ${fmtDate(dateEcheance)}.\n\n`) +
      `Rien à faire en ligne pour ce versement — communiquez avec nous pour le régler.`,
    html:
      `<p style="font-size:15px; line-height:1.6; color:#222222;">Bonjour ${nom},</p>
       <p style="font-size:15px; line-height:1.6; color:#222222;">
         ${enRetard
           ? `Le 2<sup>e</sup> versement de l'entente annuelle de <strong>${enfantNom}</strong> (<strong>${montant.toFixed(2)} $</strong>) était dû le <strong>${fmtDate(dateEcheance)}</strong>.`
           : `Le 2<sup>e</sup> versement de l'entente annuelle de <strong>${enfantNom}</strong> (<strong>${montant.toFixed(2)} $</strong>) est prévu pour le <strong>${fmtDate(dateEcheance)}</strong>.`}
       </p>
       ${encadre('Rien à faire en ligne pour ce versement — communiquez avec nous pour le régler.')}`,
  });
}

// ------------------------------------------------------------------
// 8. Demande de prépaiement (entente annuelle ou solde prépayé)
// ------------------------------------------------------------------
// Remplace l'ancien lien « nous écrire » : le parent remplit un vrai
// formulaire depuis la page de SON école, et la demande arrive déjà
// qualifiée (formule voulue + école d'origine) dans la boîte de cette
// école, avec copie à la boîte centrale — même routage que les commandes.
export async function envoyerCourrielsDemandePrepaye(demandeId: string) {
  try {
    const d = await prisma.demandePrepaye.findUnique({
      where: { id: demandeId },
      include: { institution: true },
    });
    if (!d) return;

    const formule = d.formule === 'ENTENTE' ? 'Entente annuelle' : 'Solde prépayé';
    const detailFormule = d.formule === 'ENTENTE'
      ? '1 170 $ pour l\'année (6,50 $ le repas au lieu de 7,00 $), en 1 ou 2 versements.'
      : 'Un montant déposé à l\'avance, débité au tarif régulier à chaque commande.';

    // --- Accusé au parent ---
    await envoyerCourriel({
      a: d.courriel,
      repondreA: d.institution.courriel,
      sujet: `Votre demande — ${formule}`,
      texte:
        `Bonjour ${d.nomParent},\n\n` +
        `Nous avons bien reçu votre demande pour « ${formule} » à ${d.institution.nom}.\n\n` +
        `${detailFormule}\n\n` +
        `Nous communiquerons avec vous sous peu pour la suite et les modalités de paiement. ` +
        `Rien n'est encore activé sur votre compte — aucun montant ne vous sera facturé d'ici là.`,
      html:
        `<p style="font-size:15px; line-height:1.6; color:#222222;">Bonjour ${d.nomParent},</p>
         <p style="font-size:15px; line-height:1.6; color:#222222;">Nous avons bien reçu votre demande pour « <strong>${formule}</strong> » à <strong>${d.institution.nom}</strong>.</p>
         ${encadre(detailFormule)}
         <p style="font-size:15px; line-height:1.6; color:#222222;">Nous communiquerons avec vous sous peu pour la suite et les modalités de paiement. Rien n'est encore activé sur votre compte — aucun montant ne vous sera facturé d'ici là.</p>`,
    });

    // --- Avis à l'école (voir destinatairesAvis) ---
    await envoyerCourriel({
      ...destinatairesAvis(d.institution.courriel),
      sujet: `Demande — ${formule} (${d.institution.nom})`,
      texte:
        `Un parent souhaite adhérer à « ${formule} ».\n\n` +
        `École : ${d.institution.nom}\n` +
        `Parent : ${d.nomParent}\n` +
        `Courriel : ${d.courriel}\n` +
        (d.telephone ? `Téléphone : ${d.telephone}\n` : '') +
        (d.nomEnfant ? `Enfant : ${d.nomEnfant}\n` : '') +
        (d.message ? `\nMessage :\n${d.message}\n` : '') +
        `\nToutes les demandes : ${SITE_URL}/admin/demandes`,
      html:
        `<p style="font-size:15px; line-height:1.6; color:#222222;">Un parent souhaite adhérer à « <strong>${formule}</strong> ».</p>
         ${encadre(
           `<strong>${d.nomParent}</strong><br>` +
           `${d.institution.nom}<br>` +
           `${d.courriel}` +
           (d.telephone ? `<br>${d.telephone}` : '') +
           (d.nomEnfant ? `<br>Enfant : ${d.nomEnfant}` : '')
         )}
         ${d.message ? `<p style="font-size:14.5px; line-height:1.6; color:#222222;"><strong>Message :</strong><br>${d.message.replace(/\n/g, '<br>')}</p>` : ''}
         ${bouton('Voir toutes les demandes', `${SITE_URL}/admin/demandes`)}`,
    });
  } catch (err) {
    console.error('[courriel] demande de prépaiement — échec de préparation :', err);
  }
}

// ------------------------------------------------------------------
// 10. Avis ponctuel — message libre écrit par Christine depuis
// /admin/commandes (sélection de commandes → « Envoyer un avis »), pour les
// situations qu'aucun courriel automatique ne couvre (ex. journée retirée
// d'un menu après coup — voir Christine, courriel du 31 août 2026). Sujet
// et message sont saisis à la main ; le reste suit le même gabarit brandé
// que les autres courriels transactionnels.
// ------------------------------------------------------------------
export async function envoyerAvisPersonnalise(params: { a: string; nom: string; sujet: string; message: string }) {
  const { a, nom, sujet, message } = params;
  const messageHtml = message
    .split(/\n{2,}/)
    .map((paragraphe) => `<p style="font-size:15px; line-height:1.6; color:#222222; margin:0 0 14px 0;">${paragraphe.replace(/\n/g, '<br>')}</p>`)
    .join('');

  await envoyerCourriel({
    a,
    sujet,
    texte: `Bonjour ${nom},\n\n${message}`,
    html: `<p style="font-size:15px; line-height:1.6; color:#222222;">Bonjour ${nom},</p>${messageHtml}`,
  });
}
