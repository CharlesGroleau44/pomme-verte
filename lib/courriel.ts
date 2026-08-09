// lib/courriel.ts
// Envoi de courriels transactionnels — PAS ENCORE BRANCHÉ à un
// fournisseur réel (Resend, SMTP, etc. — décision en attente de Charles).
// En attendant, le message est journalisé côté serveur : le flux
// complet (jeton, page, validation) fonctionne et se teste de bout en
// bout ; seul l'envoi effectif manque. Remplacer le corps de cette
// fonction dès qu'un fournisseur est choisi, sans toucher ses appelants.
export async function envoyerCourriel(params: { a: string; sujet: string; texte: string }): Promise<void> {
  console.log(`[courriel — envoi non configuré] À: ${params.a} | Sujet: ${params.sujet}\n${params.texte}`);
}
