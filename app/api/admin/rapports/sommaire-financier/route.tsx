// app/api/admin/rapports/sommaire-financier/route.tsx
// Rapport 1/6 — voir lib/pdf/rapports/SommaireFinancierDocument.tsx.
// Filtres : dateDebut, dateFin (AAAA-MM-JJ), institutionId — tous optionnels.
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { chargerLignesResolues, totauxLignes, ventilationParModePaiement, periodePrecedente, normaliserPeriode } from '@/lib/rapports';
import { chargerLogoTraiteur } from '@/lib/pdf/logoTraiteur';
import { fmtDatePeriode } from '@/lib/pdf/rapportStyles';
import SommaireFinancierDocument from '@/lib/pdf/rapports/SommaireFinancierDocument';

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

  const totaux = totauxLignes(lignes);
  const ventilation = ventilationParModePaiement(lignes);

  let totauxPrecedents = null;
  let periodePrecedenteTexte: string | null = null;
  if (dateDebut && dateFin) {
    const precedente = periodePrecedente(dateDebut, dateFin);
    const lignesPrecedentes = await chargerLignesResolues({ ...precedente, institutionId });
    totauxPrecedents = totauxLignes(lignesPrecedentes);
    periodePrecedenteTexte = fmtDatePeriode(precedente.dateDebut, precedente.dateFin);
  }

  const buffer = await renderToBuffer(
    <SommaireFinancierDocument
      logo={logo}
      periodeTexte={fmtDatePeriode(dateDebut, dateFin)}
      institutionFiltre={institution?.nom ?? null}
      totaux={totaux}
      totauxPrecedents={totauxPrecedents}
      periodePrecedenteTexte={periodePrecedenteTexte}
      ventilation={ventilation}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="sommaire-financier.pdf"' },
  });
}
