// app/api/menus/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { genererJourneesOuvrables } from '@/lib/menu-logic';

export const dynamic = 'force-dynamic';

export async function GET() {
  const menus = await prisma.menu.findMany({
    orderBy: { periodeDebut: 'desc' },
    include: {
      institution: true,
      thematiqueRef: true,
      journees: { include: { selections: true } },
    },
  });

  // Numéro de séquence par thématique (Christine/Charles, 9 octobre 2026 —
  // distinguer "Petits Monstres 1" de "Petits Monstres 2" dans l'admin).
  // Une nouvelle rangée Thematique est créée à chaque cycle plutôt que de
  // réutiliser l'ancienne même si le nom se répète (voir le schéma) — le
  // numéro n'est donc jamais stocké, seulement calculé : le rang de CETTE
  // thématique parmi toutes celles de même nom, par ordre de création.
  const nomsUniques = [...new Set(menus.map((m) => m.thematiqueRef?.nom).filter((n): n is string => !!n))];
  const toutesThematiquesParNom = nomsUniques.length
    ? await prisma.thematique.findMany({
        where: { nom: { in: nomsUniques } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, nom: true },
      })
    : [];
  const numeroParThematiqueId = new Map<string, number>();
  const compteurParNom = new Map<string, number>();
  for (const t of toutesThematiquesParNom) {
    const n = (compteurParNom.get(t.nom) ?? 0) + 1;
    compteurParNom.set(t.nom, n);
    numeroParThematiqueId.set(t.id, n);
  }

  const menusAvecNumero = menus.map((m) => ({
    ...m,
    thematiqueRef: m.thematiqueRef
      ? { ...m.thematiqueRef, numero: numeroParThematiqueId.get(m.thematiqueRef.id) ?? null }
      : null,
  }));

  return NextResponse.json(menusAvecNumero);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Attendu : { periodeDebut, periodeFin, thematique, dateLimiteCommande, institutionId }
  // Un menu appartient à UNE SEULE institution — pour servir le même
  // contenu à une autre, voir POST /api/menus/[id]/dupliquer.

  if (!body.periodeDebut || !body.periodeFin) {
    return NextResponse.json({ error: 'Les dates de début et de fin sont requises.' }, { status: 400 });
  }
  if (!body.dateLimiteCommande) {
    return NextResponse.json({ error: 'La date limite de commande est requise.' }, { status: 400 });
  }
  if (!body.institutionId) {
    return NextResponse.json({ error: 'Une institution doit être sélectionnée.' }, { status: 400 });
  }

  const debut = new Date(body.periodeDebut);
  const fin = new Date(body.periodeFin);

  const institution = await prisma.institution.findUnique({ where: { id: body.institutionId } });
  if (!institution) return NextResponse.json({ error: 'Institution introuvable.' }, { status: 404 });

  let joursFermes = new Set<string>();
  if (institution.calendrierScolaireId) {
    const fermes = await prisma.jourFermeCalendrier.findMany({
      where: { calendrierScolaireId: institution.calendrierScolaireId, date: { gte: debut, lte: fin } },
    });
    joursFermes = new Set(fermes.map((f) => f.date.toISOString().slice(0, 10)));
  }
  const { journees, exclues } = genererJourneesOuvrables(debut, fin, joursFermes);

  const menu = await prisma.menu.create({
    data: {
      institutionId: body.institutionId,
      periodeDebut: debut,
      periodeFin: fin,
      thematiqueId: body.thematiqueId ?? null,
      dateLimiteCommande: new Date(body.dateLimiteCommande),
      datePublication: body.datePublication ? new Date(body.datePublication) : null,
      pdfUrl: body.pdfUrl ?? null,
      journees: {
        create: journees.map((j) => ({ date: j.date, jourSemaine: j.jourSemaine })),
      },
    },
    include: {
      institution: true,
      thematiqueRef: true,
      journees: { include: { selections: true } },
    },
  });

  // Exposé pour que l'admin affiche "3 journées exclues (calendrier
  // scolaire)" au lieu de laisser Christine se demander où sont passées
  // des journées qu'elle attendait — voir app/admin/menus/nouveau/page.tsx.
  return NextResponse.json({ ...menu, joursExclus: exclues }, { status: 201 });
}
