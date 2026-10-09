// app/api/menus/[id]/export-xlsx/route.ts
// Sert le classeur de travail de Christine pour un menu donné (donc une
// école et une période, puisqu'un menu appartient à une seule institution).
//
// La construction du classeur vit dans lib/classeur-commandes.ts : elle est
// ainsi vérifiable hors HTTP, par un script qui produit exactement le même
// fichier sans avoir à ouvrir une session de console.
import { NextRequest, NextResponse } from 'next/server';
import { construireClasseurCommandes } from '@/lib/classeur-commandes';
import { sessionValide } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // Même garde que les autres routes de la console : ce classeur porte les
  // coordonnées des parents, il ne sort jamais sans session valide.
  const secret = process.env.SESSION_SECRET ?? 'dev-secret-non-securise';
  if (!(await sessionValide(req.cookies.get('pv_session')?.value, secret))) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const resultat = await construireClasseurCommandes(params.id);
  if (!resultat) return NextResponse.json({ error: 'Menu introuvable.' }, { status: 404 });

  return new NextResponse(new Uint8Array(resultat.buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(resultat.nomFichier)}"`,
    },
  });
}
