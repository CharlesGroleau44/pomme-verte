// app/api/admin/dashboard/route.ts
// Données du tableau de bord de gestion (app/admin/dashboard/page.tsx) —
// mêmes agrégations que les rapports PDF (lib/rapports.ts), renvoyées en
// JSON pour l'affichage à l'écran. Filtres : dateDebut, dateFin,
// institutionId, tous optionnels.
import { NextRequest, NextResponse } from 'next/server';
import { chargerLignesResolues, totauxLignes, ventilationParModePaiement, ventilationParInstitution } from '@/lib/rapports';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const dateDebut = req.nextUrl.searchParams.get('dateDebut');
  const dateFin = req.nextUrl.searchParams.get('dateFin');
  const institutionId = req.nextUrl.searchParams.get('institutionId');

  const lignes = await chargerLignesResolues({ dateDebut, dateFin, institutionId });

  return NextResponse.json({
    totaux: totauxLignes(lignes),
    parModePaiement: ventilationParModePaiement(lignes),
    parEcole: ventilationParInstitution(lignes),
    dates: lignes.map((l) => l.date),
  });
}
