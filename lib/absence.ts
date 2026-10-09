// lib/absence.ts
// Crédit d'absence en libre-service — demandé par Christine (courriel du
// 13 août 2026) : un parent signale l'absence de son enfant pour une
// journée déjà commandée, avant 8h30 le matin même (voir
// absenceEncoreAccordable dans lib/menu-logic.ts), et le crédit s'applique
// à son compte sans intervention de Christine.
//
// LE CRÉDIT NE PREND PAS TOUJOURS LA MÊME FORME — ça dépend du mode de
// paiement de la commande, pour ne jamais compter deux fois le même sou :
//
//   PREPAYE (entente annuelle) — retirer la ligne libère un repas dans
//   « repasRestants », calculé en comptant les lignes PREPAYE réelles (voir
//   lib/entente.ts). Rien d'autre à faire.
//
//   SOLDE_PREPAYE — retirer la ligne réduit `consomme`, donc augmente
//   `disponible` (voir lib/solde-prepaye.ts) — même mécanique. Créer un
//   DepotPrepaye EN PLUS doublerait le crédit.
//
//   ARGENT / VIREMENT_INTERAC / CHEQUE / FONDATION — ces modes n'ont aucun
//   ledger : retirer la ligne ne redonnait rien au parent. C'est le seul
//   cas où on crée un DepotPrepaye pour le montant de la journée annulée,
//   et où on active soldePrepayeActif si ce n'était pas déjà fait — sans
//   quoi le crédit resterait invisible (rien ne le rend dépensable) et le
//   parent devrait quand même écrire à Christine pour l'appliquer, ce qui
//   annule tout l'intérêt du libre-service.
import { prisma } from './prisma';
import { absenceEncoreAccordable, prixLigne, selectionVersTexte } from './menu-logic';

export class ErreurAbsence extends Error {
  statut: number;
  constructor(message: string, statut = 422) {
    super(message);
    this.statut = statut;
  }
}

const MODES_SANS_LEDGER = ['ARGENT', 'VIREMENT_INTERAC', 'CHEQUE', 'FONDATION'];

/**
 * Retire la ligne de la journée signalée absente et applique le crédit
 * approprié. Vérifie que la commande appartient bien à ce parent — appelé
 * depuis une route déjà authentifiée, mais la vérification reste ici pour
 * qu'aucun appelant futur ne puisse l'oublier.
 */
export async function accorderAbsence(compteParentId: string, commandeId: string, journeeId: string) {
  const commande = await prisma.commande.findUnique({
    where: { id: commandeId },
    include: {
      lignes: { include: { journee: true, selection: { include: { repas: true } } } },
      enfant: true,
    },
  });
  if (!commande || commande.compteParentId !== compteParentId) {
    throw new ErreurAbsence('Commande introuvable.', 404);
  }

  const ligne = commande.lignes.find((l) => l.journeeId === journeeId);
  if (!ligne) {
    throw new ErreurAbsence('Aucune commande pour cette journée.', 404);
  }
  if (!absenceEncoreAccordable(ligne.journee.date)) {
    throw new ErreurAbsence(
      'La date limite pour signaler cette absence (8h30 le matin même) est passée pour cette journée.'
    );
  }

  const cout = prixLigne(ligne, selectionVersTexte(ligne.selection));
  const creeDepot = MODES_SANS_LEDGER.includes(commande.modePaiement);

  await prisma.$transaction(async (tx) => {
    await tx.ligneCommande.delete({ where: { id: ligne.id } });

    const lignesRestantes = await tx.ligneCommande.count({ where: { commandeId } });
    // Une commande sans aucune journée n'a plus de sens à conserver — elle
    // ne représenterait ni un montant dû, ni rien à préparer en cuisine.
    if (lignesRestantes === 0) {
      await tx.commande.delete({ where: { id: commandeId } });
    }

    if (creeDepot) {
      const motif = `Absence créditée — ${commande.enfant.prenom} ${commande.enfant.nomDeFamille}, ${ligne.journee.jourSemaine} ${new Date(ligne.journee.date).getUTCDate()}`;
      await tx.depotPrepaye.create({ data: { compteParentId, montant: cout, motif } });
      await tx.compteParent.update({
        where: { id: compteParentId },
        data: { soldePrepayeActif: true },
      });
    }
  });

  return { montantCredite: creeDepot ? cout : 0, credite: creeDepot };
}
