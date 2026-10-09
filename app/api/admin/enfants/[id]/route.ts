// app/api/admin/enfants/[id]/route.ts
// Entente annuelle — activée PAR ENFANT depuis le 17 août 2026 (Christine :
// chaque enfant a son propre forfait de 180 repas, plutôt qu'un bassin
// partagé entre tous les enfants d'un même compte — voir lib/entente.ts).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ('prepayeAnnuel' in body) {
    if (typeof body.prepayeAnnuel !== 'boolean') {
      return NextResponse.json({ error: 'prepayeAnnuel doit être un booléen.' }, { status: 400 });
    }
    data.prepayeAnnuel = body.prepayeAnnuel;
    // Désactiver l'entente efface son suivi — sinon un rappel de versement
    // pourrait continuer à partir pour un enfant qui n'est plus prépayé.
    if (!body.prepayeAnnuel) {
      data.ententeVersements = null;
      data.ententeDate2eVersement = null;
      data.ententeVerse2Paye = false;
      data.ententeDernierRappelEnvoye = null;
    }
  }
  if ('ententeVersements' in body) {
    const v = body.ententeVersements;
    if (v !== null && v !== 1 && v !== 2) {
      return NextResponse.json({ error: 'ententeVersements doit être 1, 2 ou null.' }, { status: 400 });
    }
    data.ententeVersements = v;
  }
  if ('ententeDate2eVersement' in body) {
    data.ententeDate2eVersement = body.ententeDate2eVersement ? new Date(body.ententeDate2eVersement) : null;
  }
  if ('ententeVerse2Paye' in body) {
    if (typeof body.ententeVerse2Paye !== 'boolean') {
      return NextResponse.json({ error: 'ententeVerse2Paye doit être un booléen.' }, { status: 400 });
    }
    data.ententeVerse2Paye = body.ententeVerse2Paye;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Aucun champ valide fourni.' }, { status: 400 });
  }

  const enfant = await prisma.enfant.update({ where: { id: params.id }, data });
  return NextResponse.json(enfant);
}
