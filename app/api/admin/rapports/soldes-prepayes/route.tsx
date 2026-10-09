// app/api/admin/rapports/soldes-prepayes/route.tsx
// Rapport 4/6 — voir lib/pdf/rapports/SoldesPrepayesDocument.tsx.
// Filtre : institutionId seulement (état vivant, pas de fenêtre de dates).
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { chargerSoldesPrepayes } from '@/lib/rapports';
import { chargerLogoTraiteur } from '@/lib/pdf/logoTraiteur';
import SoldesPrepayesDocument from '@/lib/pdf/rapports/SoldesPrepayesDocument';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const institutionId = req.nextUrl.searchParams.get('institutionId');

  const [soldes, institution, logo] = await Promise.all([
    chargerSoldesPrepayes(institutionId),
    institutionId ? prisma.institution.findUnique({ where: { id: institutionId } }) : null,
    chargerLogoTraiteur(),
  ]);

  const buffer = await renderToBuffer(
    <SoldesPrepayesDocument logo={logo} institutionFiltre={institution?.nom ?? null} soldes={soldes} />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="soldes-prepayes.pdf"' },
  });
}
