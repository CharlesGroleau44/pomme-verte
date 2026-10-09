// app/api/admin/rapports/ententes-annuelles/route.tsx
// Rapport 3/6 — voir lib/pdf/rapports/EntentesAnnuellesDocument.tsx.
// Filtre : institutionId seulement (état vivant, pas de fenêtre de dates).
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { chargerEntentesAnnuelles } from '@/lib/rapports';
import { chargerLogoTraiteur } from '@/lib/pdf/logoTraiteur';
import EntentesAnnuellesDocument from '@/lib/pdf/rapports/EntentesAnnuellesDocument';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const institutionId = req.nextUrl.searchParams.get('institutionId');

  const [ententes, institution, logo] = await Promise.all([
    chargerEntentesAnnuelles(institutionId),
    institutionId ? prisma.institution.findUnique({ where: { id: institutionId } }) : null,
    chargerLogoTraiteur(),
  ]);

  const buffer = await renderToBuffer(
    <EntentesAnnuellesDocument logo={logo} institutionFiltre={institution?.nom ?? null} ententes={ententes} />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="ententes-annuelles.pdf"' },
  });
}
