// app/api/parent/commandes/route.ts
// La version numérique du coupon-réponse : un enfant, un menu, un mode
// de paiement, une ligne par journée commandée. POST fait office de
// création ET de modification — une seule commande par (enfant, menu),
// voir @@unique sur Commande dans le schéma. Réservé aux parents
// connectés — voir POST /api/parent/commandes-invite pour le mode invité.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { idParentDepuisCookie } from '@/lib/parent-session';
import { ErreurCommande, MODES_PAIEMENT_VALIDES, chargerEtValiderMenu, enregistrerCommande, validerLignes } from '@/lib/commandes';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const compteParentId = await idParentDepuisCookie(req.cookies.get('pv_parent')?.value);
  if (!compteParentId) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const commandes = await prisma.commande.findMany({
    where: { compteParentId },
    include: {
      enfant: true,
      menu: { include: { institution: true } },
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

  const body = await req.json();
  const enfantId = typeof body.enfantId === 'string' ? body.enfantId : '';
  const menuId = typeof body.menuId === 'string' ? body.menuId : '';
  const modePaiement = typeof body.modePaiement === 'string' ? body.modePaiement : '';

  if (!MODES_PAIEMENT_VALIDES.includes(modePaiement)) {
    return NextResponse.json({ error: 'Mode de paiement invalide.' }, { status: 400 });
  }

  try {
    const lignes = validerLignes(body.lignes);

    const enfant = await prisma.enfant.findUnique({ where: { id: enfantId } });
    if (!enfant || enfant.compteParentId !== compteParentId) {
      return NextResponse.json({ error: 'Enfant introuvable.' }, { status: 404 });
    }

    await chargerEtValiderMenu(menuId, enfant.institutionId, lignes, modePaiement);
    const commande = await enregistrerCommande({ compteParentId, enfantId, menuId, modePaiement, lignes });
    return NextResponse.json(commande, { status: 201 });
  } catch (e) {
    if (e instanceof ErreurCommande) return NextResponse.json({ error: e.message }, { status: e.statut });
    throw e;
  }
}
