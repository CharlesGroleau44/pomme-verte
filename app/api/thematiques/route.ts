// app/api/thematiques/route.ts
// Les thématiques (« Passeport Gourmand », « Tour du monde »…) —
// l'habillage d'un cycle de menus, changé environ une fois par mois et
// appliqué à toutes les institutions à la fois. Voir le commentaire du
// modèle Thematique dans prisma/schema.prisma.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const thematiques = await prisma.thematique.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { menus: true } } },
  });

  // Numéro de séquence par nom — une nouvelle rangée est créée à chaque
  // cycle même si le nom se répète (ex. « Petits Monstres » d'une année à
  // l'autre) ; calculé ici, jamais stocké. Voir aussi GET /api/menus.
  const compteurParNom = new Map<string, number>();
  const parCreation = [...thematiques].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const numeroParId = new Map<string, number>();
  for (const t of parCreation) {
    const n = (compteurParNom.get(t.nom) ?? 0) + 1;
    compteurParNom.set(t.nom, n);
    numeroParId.set(t.id, n);
  }
  const thematiquesAvecNumero = thematiques.map((t) => ({ ...t, numero: numeroParId.get(t.id) ?? null }));

  return NextResponse.json(thematiquesAvecNumero);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const nom = String(body.nom ?? '').trim();
  if (!nom) {
    return NextResponse.json({ error: 'Le nom de la thématique est requis.' }, { status: 400 });
  }

  const thematique = await prisma.thematique.create({
    data: { nom, photoUrl: body.photoUrl || null },
  });
  return NextResponse.json(thematique, { status: 201 });
}
