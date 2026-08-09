// app/api/menus/[id]/dupliquer/route.ts
// Copie complète d'un menu (journées + sélections, avec leurs overrides)
// vers une autre institution — c'est le mécanisme prévu pour servir le
// même contenu à plusieurs institutions, un menu n'appartenant qu'à une
// seule à la fois. Le duplicata part toujours NON PUBLIÉ, peu importe
// l'état de l'original.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  if (!body.institutionId) {
    return NextResponse.json({ error: 'institutionId est requis.' }, { status: 400 });
  }

  const original = await prisma.menu.findUnique({
    where: { id: params.id },
    include: { journees: { include: { selections: true } } },
  });
  if (!original) return NextResponse.json({ error: 'Menu introuvable.' }, { status: 404 });

  const copie = await prisma.menu.create({
    data: {
      institutionId: body.institutionId,
      periodeDebut: original.periodeDebut,
      periodeFin: original.periodeFin,
      thematique: original.thematique,
      dateLimiteCommande: original.dateLimiteCommande,
      pdfUrl: original.pdfUrl,
      publie: false,
      journees: {
        create: original.journees.map((j) => ({
          date: j.date,
          jourSemaine: j.jourSemaine,
          selections: {
            create: j.selections.map((s) => ({
              repasId: s.repasId,
              nomOverride: s.nomOverride,
              descriptionOverride: s.descriptionOverride,
              photoUrlOverride: s.photoUrlOverride,
              prixPetitOverride: s.prixPetitOverride,
              prixRegulierOverride: s.prixRegulierOverride,
              prixDeuxiemeServiceOverride: s.prixDeuxiemeServiceOverride,
            })),
          },
        })),
      },
    },
    include: { institution: true },
  });

  return NextResponse.json(copie, { status: 201 });
}
