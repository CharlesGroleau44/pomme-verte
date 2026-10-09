// app/api/admin/rapports/frequentation/route.tsx
// Rapport 5/6 — voir lib/pdf/rapports/FrequentationDocument.tsx.
// Filtres : dateDebut, dateFin, institutionId.
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { chargerFrequentation, normaliserPeriode } from '@/lib/rapports';
import { chargerLogoTraiteur } from '@/lib/pdf/logoTraiteur';
import { fmtDatePeriode } from '@/lib/pdf/rapportStyles';
import FrequentationDocument from '@/lib/pdf/rapports/FrequentationDocument';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { dateDebut, dateFin } = normaliserPeriode({
    dateDebut: req.nextUrl.searchParams.get('dateDebut'),
    dateFin: req.nextUrl.searchParams.get('dateFin'),
  });
  const institutionId = req.nextUrl.searchParams.get('institutionId');

  const [institutions, logo] = await Promise.all([
    chargerFrequentation({ dateDebut, dateFin, institutionId }),
    chargerLogoTraiteur(),
  ]);

  const buffer = await renderToBuffer(
    <FrequentationDocument logo={logo} periodeTexte={fmtDatePeriode(dateDebut, dateFin)} institutions={institutions} />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="frequentation.pdf"' },
  });
}
