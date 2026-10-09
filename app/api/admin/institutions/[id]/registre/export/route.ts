// app/api/admin/institutions/[id]/registre/export/route.ts
// Export Excel du registre — voir lib/registre-eleves.ts.
import { NextRequest, NextResponse } from 'next/server';
import { construireRegistreExcel } from '@/lib/registre-eleves';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const resultat = await construireRegistreExcel(params.id);
  if (!resultat) return NextResponse.json({ error: 'Institution introuvable.' }, { status: 404 });

  return new NextResponse(resultat.buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${resultat.nomFichier}"`,
    },
  });
}
