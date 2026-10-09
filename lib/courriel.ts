// lib/courriel.ts
// Envoi de courriels transactionnels via le serveur SMTP maison
// (mail.traiteurlapommeverte.com — SPF, DKIM et DMARC configurés au DNS,
// voir la note d'installation). Un seul point d'envoi pour toute
// l'application : tous les courriels passent par envoyerCourriel().
//
// Sans configuration SMTP (développement local), rien n'est envoyé mais
// le message est journalisé — le reste de l'application continue de
// fonctionner normalement.
import nodemailer, { type Transporter } from 'nodemailer';

export type Courriel = {
  a: string;
  /** Copie conforme — l'avis de commande part à l'école ET à la boîte centrale. */
  copie?: string;
  sujet: string;
  texte: string;
  /** Corps HTML. Sera enveloppé dans le gabarit brandé si fourni. */
  html?: string;
  /**
   * Adresse où atterrit une réponse du parent — par défaut REPONDRE_A
   * (info@), une boîte centrale unique. Un courriel lié à UNE école
   * précise (commande, annulation, rappel, demande de prépaiement) doit
   * plutôt renvoyer vers l'adresse de CETTE école : sinon toute réponse
   * d'un parent, peu importe son école, atterrit dans la même boîte que
   * Christine doit trier elle-même — exactement ce qu'elle a signalé
   * (courriel du 11 septembre 2026 : « je reçois beaucoup de courriel que
   * je n'avais pas à gérer avant »). Absent ou vide = comportement d'avant.
   */
  repondreA?: string | null;
};

const HOTE = process.env.SMTP_HOST;
const PORT = Number(process.env.SMTP_PORT ?? 587);
const USAGER = process.env.SMTP_USER;
const MOT_DE_PASSE = process.env.SMTP_PASS;
const EXPEDITEUR = process.env.SMTP_FROM ?? 'Traiteur La Pomme Verte <info@traiteurlapommeverte.com>';
// Un parent qui répond à un accusé de réception doit tomber dans une vraie
// boîte lue, pas dans le vide.
const REPONDRE_A = process.env.SMTP_REPLY_TO ?? 'info@traiteurlapommeverte.com';

// Destinataire des avis internes (nouvelle commande, annulation). Reste sur
// le Gmail que Christine consulte déjà tant qu'elle n'a pas basculé sur info@.
export const COURRIEL_ADMIN = process.env.COURRIEL_ADMIN ?? 'traiteurlapommeverte@gmail.com';
export const SITE_URL = process.env.SITE_URL ?? 'https://menus.traiteurlapommeverte.com';

// ------------------------------------------------------------------
// À qui part un avis déclenché par un formulaire public : nouvelle
// commande, annulation, demande de prépaiement.
//
// Christine a tranché (courriels du 11 août 2026) : chaque école reçoit
// les avis de SES parents, et elle-même ne reçoit rien — ni en direct, ni
// en copie. Un avis par commande sur 8 écoles devient vite illisible, et
// elle suit tout par la console (/admin/commandes, /admin/demandes), qui
// est la source de vérité.
//
// Le repli sur la boîte centrale ne sert qu'aux écoles sans adresse
// courriel — sinon l'avis n'irait nulle part. Les 8 écoles actuelles en
// ont une, donc ce repli ne se déclenche pas aujourd'hui ; il protège le
// cas d'une nouvelle institution créée sans courriel.
//
// À NE PAS CONFONDRE avec les coordonnées Interac affichées au parent
// dans son accusé de commande : celles-là sont aussi l'adresse de SON
// école, mais pour une autre raison — c'est là qu'elle reçoit réellement
// les virements. Les deux se ressemblent, mais changer l'une ne doit pas
// entraîner l'autre.
// ------------------------------------------------------------------
export function destinatairesAvis(institutionCourriel: string | null): { a: string; copie?: string } {
  if (institutionCourriel) {
    return { a: institutionCourriel };
  }
  return { a: COURRIEL_ADMIN };
}

const smtpConfigure = Boolean(HOTE && USAGER && MOT_DE_PASSE);

// Un seul transport réutilisé — ouvrir une connexion SMTP par courriel
// serait lent et se ferait vite limiter par le serveur.
let transport: Transporter | null = null;
function obtenirTransport(): Transporter | null {
  if (!smtpConfigure) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host: HOTE,
      port: PORT,
      // 465 = TLS implicite ; 587 = STARTTLS (secure: false, puis
      // négociation) — c'est le port standard de soumission.
      secure: PORT === 465,
      auth: { user: USAGER, pass: MOT_DE_PASSE },
    });
  }
  return transport;
}

// ------------------------------------------------------------------
// Gabarit brandé — même identité visuelle que la plateforme : vert
// profond de la marque, texte lisible, largeur limitée. Volontairement
// en HTML de table simple et sans CSS externe : les clients courriel
// (Outlook en tête) ne gèrent ni les feuilles de style, ni les
// dégradés, ni la mise en page moderne.
// ------------------------------------------------------------------
const VERT = '#1B4A1E';
const VERT_CLAIR = '#3B8C47';
const VERT_PALE = '#F0F5E7';
const LISERE = '#C7DE8E';

export function bouton(texte: string, url: string): string {
  return `<p style="text-align:center; margin:26px 0;">
  <a href="${url}" style="background-color:${VERT}; color:#ffffff; font-size:15px; font-weight:bold; padding:13px 28px; text-decoration:none; display:inline-block; border-radius:6px;">${texte}</a>
</p>`;
}

export function encadre(contenuHtml: string): string {
  return `<div style="font-size:14.5px; line-height:1.6; color:#222222; background-color:${VERT_PALE}; padding:16px; margin:18px 0;">${contenuHtml}</div>`;
}

/** Enveloppe un contenu HTML dans l'identité Traiteur La Pomme Verte. */
export function gabarit(titre: string, contenuHtml: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${titre}</title></head>
<body style="margin:0; padding:0; background-color:#ffffff; font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px; margin:0 auto; padding:20px;">

  <div style="border-bottom:3px solid ${VERT}; padding-bottom:14px; margin-bottom:22px;">
    <div style="font-size:12px; font-weight:bold; letter-spacing:1px; color:${VERT_CLAIR}; text-transform:uppercase;">Traiteur La Pomme Verte</div>
    <div style="font-size:21px; font-weight:bold; color:${VERT}; margin-top:6px;">${titre}</div>
  </div>

  ${contenuHtml}

  <div style="border-top:2px solid ${LISERE}; padding-top:18px; margin-top:30px;">
    <p style="font-size:12.5px; line-height:1.6; color:#666666; margin:0;">
      Traiteur La Pomme Verte — <a href="${SITE_URL}/menus" style="color:${VERT_CLAIR};">menus.traiteurlapommeverte.com</a><br>
      Ce courriel vous a été envoyé automatiquement à la suite d'une action sur la plateforme.
    </p>
  </div>

</div>
</body>
</html>`;
}

// ------------------------------------------------------------------
// Envoi. Ne lève JAMAIS : un courriel qui échoue ne doit pas faire
// échouer l'action du parent (commande enregistrée, compte créé…).
// L'erreur est journalisée pour diagnostic.
// ------------------------------------------------------------------
export async function envoyerCourriel(params: Courriel): Promise<void> {
  const t = obtenirTransport();

  if (!t) {
    console.log(`[courriel — SMTP non configuré] À: ${params.a} | Sujet: ${params.sujet}\n${params.texte}`);
    return;
  }

  try {
    await t.sendMail({
      from: EXPEDITEUR,
      replyTo: params.repondreA || REPONDRE_A,
      to: params.a,
      cc: params.copie,
      subject: params.sujet,
      text: params.texte,
      html: params.html ? gabarit(params.sujet, params.html) : undefined,
    });
  } catch (err) {
    console.error(`[courriel] échec d'envoi à ${params.a} (${params.sujet}) :`, err);
  }
}
