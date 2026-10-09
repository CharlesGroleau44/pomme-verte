// app/api/parent/commandes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { idParentDepuisCookie } from '@/lib/parent-session';
import { envoyerCourrielsAnnulation } from '@/lib/courriels-envois';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const compteParentId = await idParentDepuisCookie(req.cookies.get('pv_parent')?.value);
  if (!compteParentId) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  // On charge tout ce que le courriel d'annulation devra nommer AVANT la
  // suppression — après, ces enregistrements n'existent plus.
  const commande = await prisma.commande.findUnique({
    where: { id: params.id },
    include: {
      compteParent: true,
      enfant: { include: { institution: true } },
      menu: { include: { thematiqueRef: true } },
    },
  });
  if (!commande || commande.compteParentId !== compteParentId) {
    return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 });
  }

  await prisma.commande.delete({ where: { id: params.id } });

  void envoyerCourrielsAnnulation({
    courrielParent: commande.compteParent.courriel,
    nomParent: commande.compteParent.nom,
    enfantNom: `${commande.enfant.prenom} ${commande.enfant.nomDeFamille}`,
    institutionNom: commande.enfant.institution.nom,
    institutionCourriel: commande.enfant.institution.courriel,
    thematique: commande.menu.thematiqueRef?.nom ?? 'Menu',
  });

  return NextResponse.json({ ok: true });
}
