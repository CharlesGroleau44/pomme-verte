// app/api/admin/institutions/[id]/registre/import/route.ts
// Import du fichier Excel envoyé par l'école — voir lib/registre-eleves.ts.
import { NextRequest, NextResponse } from 'next/server';
import { parserFichierEleves, remplacerRegistre } from '@/lib/registre-eleves';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const formData = await req.formData();
  const fichier = formData.get('fichier');

  if (!(fichier instanceof File)) {
    return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 });
  }

  const buffer = Buffer.from(await fichier.arrayBuffer());
  const eleves = await parserFichierEleves(buffer);
  if (eleves.length === 0) {
    return NextResponse.json({ error: 'Aucun élève trouvé dans ce fichier — vérifiez le format (colonne A « Nom, Prénom », colonne B le niveau).' }, { status: 400 });
  }

  await remplacerRegistre(params.id, eleves);
  return NextResponse.json({ ok: true, nombre: eleves.length });
}
