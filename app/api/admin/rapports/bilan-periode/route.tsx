// app/api/admin/rapports/bilan-periode/route.tsx
// Rapport 6/6 — voir lib/pdf/rapports/BilanPeriodeDocument.tsx.
// Filtres : dateDebut, dateFin, institutionId.
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { chargerLignesResolues, ventilationParMois, normaliserPeriode } from '@/lib/rapports';
import { chargerLogoTraiteur } from '@/lib/pdf/logoTraiteur';
import { fmtDatePeriode } from '@/lib/pdf/rapportStyles';
import BilanPeriodeDocument from '@/lib/pdf/rapports/BilanPeriodeDocument';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { dateDebut, dateFin } = normaliserPeriode({
    dateDebut: req.nextUrl.searchParams.get('dateDebut'),
    dateFin: req.nextUrl.searchParams.get('dateFin'),
  });
  const institutionId = req.nextUrl.searchParams.get('institutionId');

  const [lignes, institution, logo] = await Promise.all([
    chargerLignesResolues({ dateDebut, dateFin, institutionId }),
    institutionId ? prisma.institution.findUnique({ where: { id: institutionId } }) : null,
    chargerLogoTraiteur(),
  ]);

  const buffer = await renderToBuffer(
    <BilanPeriodeDocument
      logo={logo}
      periodeTexte={fmtDatePeriode(dateDebut, dateFin)}
      institutionFiltre={institution?.nom ?? null}
      parMois={ventilationParMois(lignes)}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="bilan-periode.pdf"' },
  });
}
