// app/api/admin/rapports/par-ecole/route.tsx
// Rapport 2/6 — voir lib/pdf/rapports/ParEcoleDocument.tsx.
// Filtres : dateDebut, dateFin — pas de filtre école (le rapport EST la
// comparaison entre écoles).
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { chargerLignesResolues, ventilationParInstitution, normaliserPeriode } from '@/lib/rapports';
import { chargerLogoTraiteur } from '@/lib/pdf/logoTraiteur';
import { fmtDatePeriode } from '@/lib/pdf/rapportStyles';
import ParEcoleDocument from '@/lib/pdf/rapports/ParEcoleDocument';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { dateDebut, dateFin } = normaliserPeriode({
    dateDebut: req.nextUrl.searchParams.get('dateDebut'),
    dateFin: req.nextUrl.searchParams.get('dateFin'),
  });

  const [lignes, logo] = await Promise.all([
    chargerLignesResolues({ dateDebut, dateFin }),
    chargerLogoTraiteur(),
  ]);

  const buffer = await renderToBuffer(
    <ParEcoleDocument logo={logo} periodeTexte={fmtDatePeriode(dateDebut, dateFin)} ecoles={ventilationParInstitution(lignes)} />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="rapport-par-ecole.pdf"' },
  });
}
