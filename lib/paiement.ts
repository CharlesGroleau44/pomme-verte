// lib/paiement.ts
// Solde dû d'une commande, à partir du montant déjà reçu (Commande.montantPaye).
//
// Pourquoi pas juste « paye » : une commande couvre un menu de deux semaines
// et peut recevoir des ajouts tardifs APRÈS le paiement. Lundi 8 $ reçus par
// virement (payé coché) ; mercredi une commande tardive de 8 $ s'ajoute — la
// commande redevient non payée, mais le solde dû est de 8 $, pas de 16 $
// (Christine, 27 octobre 2026). Une commande payée sans montant enregistré
// (cas d'avant ce champ) reste entièrement réglée.

/** Convertit un Decimal Prisma / une chaîne JSON / un nombre en nombre, 0 si absent. */
export function enNombre(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

/** Ce qui reste à encaisser sur la commande (0 si payée), arrondi au cent. */
export function soldeDu(commande: { paye: boolean; montantPaye?: unknown }, total: number): number {
  if (commande.paye) return 0;
  return Math.max(0, Math.round((total - enNombre(commande.montantPaye)) * 100) / 100);
}

/** « partiel » = non payée mais une partie a déjà été reçue. */
export function etatPaiement(commande: { paye: boolean; montantPaye?: unknown }, total: number): 'paye' | 'partiel' | 'impaye' {
  if (commande.paye) return 'paye';
  const recu = enNombre(commande.montantPaye);
  return recu > 0 && soldeDu(commande, total) < total ? 'partiel' : 'impaye';
}
