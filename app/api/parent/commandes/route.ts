// app/api/parent/commandes/route.ts
// La version numérique du coupon-réponse : un enfant, un menu, un mode
// de paiement, une ligne par journée commandée. POST fait office de
// création ET de modification — une seule commande par (enfant, menu),
// voir @@unique sur Commande dans le schéma. Réservé aux parents
// connectés — un compte est obligatoire pour commander.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { idParentDepuisCookie } from '@/lib/parent-session';
import {
  ErreurCommande, MODES_PAIEMENT_VALIDES, chargerEtValiderMenu, chargerEtValiderMenuTardif,
  enregistrerCommande, enregistrerCommandeTardive, validerLignes,
} from '@/lib/commandes';
import { envoyerCourrielsNouvelleCommande } from '@/lib/courriels-envois';
import { budgetDisponiblePour, soldePrepaye } from '@/lib/solde-prepaye';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const compteParentId = await idParentDepuisCookie(req.cookies.get('pv_parent')?.value);
  if (!compteParentId) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const commandes = await prisma.commande.findMany({
    where: { compteParentId },
    include: {
      enfant: true,
      menu: { include: { institution: true, thematiqueRef: true } },
      lignes: {
        include: { journee: true, selection: { include: { repas: true } } },
        orderBy: { journee: { date: 'asc' } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(commandes);
}

export async function POST(req: NextRequest) {
  const compteParentId = await idParentDepuisCookie(req.cookies.get('pv_parent')?.value);
  if (!compteParentId) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const parent = await prisma.compteParent.findUnique({ where: { id: compteParentId } });
  if (!parent) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const body = await req.json();
  const enfantId = typeof body.enfantId === 'string' ? body.enfantId : '';
  const menuId = typeof body.menuId === 'string' ? body.menuId : '';
  const modePaiementDemande = typeof body.modePaiement === 'string' ? body.modePaiement : '';

  const enfant = await prisma.enfant.findUnique({ where: { id: enfantId } });
  if (!enfant || enfant.compteParentId !== compteParentId) {
    return NextResponse.json({ error: 'Enfant introuvable.' }, { status: 404 });
  }

  // Le mode de paiement d'une commande prépayée (entente annuelle — par
  // enfant, voir lib/entente.ts — ou solde libre — par compte, voir
  // lib/solde-prepaye.ts) n'est JAMAIS DÉCLARÉ par le client — sinon une
  // commande pourrait se glisser hors du solde réel en falsifiant le corps
  // de la requête. Mais un solde actif insuffisant ne bloque plus la
  // commande : elle retombe simplement sur modePaiementDemande (voir
  // Christine, 9 octobre 2026 — un parent au solde épuisé restait bloqué
  // tant qu'un virement n'était pas appliqué manuellement à son compte).
  // Le calcul exact du budget disponible dépend du chemin (régulier vs
  // tardif, voir plus bas) — modePaiement n'est donc tranché qu'une fois
  // coutLignes connu, au cas par cas ci-dessous.

  try {
    // Commande tardive (dépannage) — après la date limite normale, tant que
    // le menu reste dans sa semaine de service. Un chemin séparé de la
    // commande régulière ci-dessous : pas de "lignes" (journée + sélection +
    // taille), seulement les journées voulues, au tarif dépannage fixe de
    // l'institution (voir Christine, courriels des 8-9 septembre 2026).
    if (body.tardive === true) {
      const journeeIds = Array.isArray(body.journeeIds)
        ? body.journeeIds.filter((j: unknown): j is string => typeof j === 'string')
        : [];

      const { journeesChoisies, prixUnitaire, coutLignes } = await chargerEtValiderMenuTardif(
        menuId, enfant.institutionId, journeeIds, modePaiementDemande
      );

      // Pas budgetDisponiblePour() ici : celle-ci suppose que la commande
      // existante sera remplacée en entier (comme enregistrerCommande),
      // hypothèse fausse pour une commande tardive qui AJOUTE des lignes
      // sans toucher aux autres — la rajouter au disponible surestimerait
      // le budget réel.
      let modePaiement: string;
      if (enfant.prepayeAnnuel) {
        modePaiement = 'PREPAYE';
      } else if (parent.soldePrepayeActif) {
        const { disponible } = await soldePrepaye(compteParentId);
        modePaiement = coutLignes <= disponible ? 'SOLDE_PREPAYE' : modePaiementDemande;
      } else {
        modePaiement = modePaiementDemande;
      }

      if (!MODES_PAIEMENT_VALIDES.includes(modePaiement)) {
        return NextResponse.json({ error: 'Mode de paiement invalide.' }, { status: 400 });
      }
      if (modePaiement === 'SOLDE_PREPAYE' && !parent.soldePrepayeActif) {
        return NextResponse.json({ error: 'Ce mode de paiement n\'est pas disponible pour votre compte.' }, { status: 400 });
      }

      const commande = await enregistrerCommandeTardive({
        compteParentId, enfantId, menuId, modePaiement, journeesChoisies, prixUnitaire,
      });
      void envoyerCourrielsNouvelleCommande(commande.id);
      return NextResponse.json(commande, { status: 201 });
    }

    const lignes = validerLignes(body.lignes);

    const { coutLignes } = await chargerEtValiderMenu(menuId, enfant.institutionId, lignes, modePaiementDemande, enfant.niveau);

    // Un solde prépayé actif mais insuffisant ne bloque plus la commande :
    // elle retombe sur modePaiementDemande (voir note en haut du fichier).
    let modePaiement: string;
    if (enfant.prepayeAnnuel) {
      modePaiement = 'PREPAYE';
    } else if (parent.soldePrepayeActif) {
      const budget = await budgetDisponiblePour(compteParentId, enfantId, menuId);
      modePaiement = coutLignes <= budget ? 'SOLDE_PREPAYE' : modePaiementDemande;
    } else {
      modePaiement = modePaiementDemande;
    }

    if (!MODES_PAIEMENT_VALIDES.includes(modePaiement)) {
      return NextResponse.json({ error: 'Mode de paiement invalide.' }, { status: 400 });
    }
    // Personne ne peut se DÉCLARER prépayé de son propre chef — ces deux
    // modes ne peuvent provenir que de la dérivation ci-dessus. Sans cette
    // garde, une commande ordinaire pourrait envoyer modePaiement: "PREPAYE"
    // et sauter le paiement sans que l'enfant ait de vraie entente.
    if (modePaiement === 'PREPAYE' && !enfant.prepayeAnnuel) {
      return NextResponse.json({ error: 'Ce mode de paiement n\'est pas disponible pour cet enfant.' }, { status: 400 });
    }
    if (modePaiement === 'SOLDE_PREPAYE' && !parent.soldePrepayeActif) {
      return NextResponse.json({ error: 'Ce mode de paiement n\'est pas disponible pour votre compte.' }, { status: 400 });
    }

    const commande = await enregistrerCommande({ compteParentId, enfantId, menuId, modePaiement, lignes });
    // Sans await : le parent ne doit pas attendre le dialogue SMTP pour voir
    // sa confirmation à l'écran. Le serveur est un service systemd de longue
    // durée, la promesse va jusqu'au bout — et la fonction n'échoue jamais.
    void envoyerCourrielsNouvelleCommande(commande.id);
    return NextResponse.json(commande, { status: 201 });
  } catch (e) {
    if (e instanceof ErreurCommande) return NextResponse.json({ error: e.message }, { status: e.statut });
    throw e;
  }
}
