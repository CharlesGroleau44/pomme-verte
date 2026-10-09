// app/api/commandes/rapport-pdf/route.tsx
// PDF imprimable du rapport de préparation pour un menu — combien de
// chaque plat préparer, par journée, plus les allergies à surveiller.
// Admin seulement (protégé par le middleware par défaut).
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import RapportDocument, { type JourneeRapport, type AllergieRapport } from '@/lib/pdf/RapportDocument';
import type { PhotoResolue } from '@/lib/pdf/MenuDocument';

export const dynamic = 'force-dynamic';

const LABEL_TAILLE: Record<string, string> = { PETIT: 'Petit repas', REGULIER: 'Repas régulier', DEUXIEME_SERVICE: 'Portion +' };

export async function GET(req: NextRequest) {
  const menuId = req.nextUrl.searchParams.get('menuId');
  if (!menuId) return NextResponse.json({ error: 'menuId est requis.' }, { status: 400 });

  const menu = await prisma.menu.findUnique({ where: { id: menuId }, include: { institution: true, thematiqueRef: true } });
  if (!menu) return NextResponse.json({ error: 'Menu introuvable.' }, { status: 404 });

  const commandes = await prisma.commande.findMany({
    where: { menuId },
    include: {
      enfant: true,
      lignes: { include: { journee: true, selection: { include: { repas: true } } }, orderBy: { journee: { date: 'asc' } } },
    },
  });

  const parJournee = new Map<string, JourneeRapport>();
  for (const c of commandes) {
    for (const l of c.lignes) {
      if (!parJournee.has(l.journeeId)) {
        parJournee.set(l.journeeId, { id: l.journeeId, date: l.journee.date.toISOString(), jourSemaine: l.journee.jourSemaine, plats: [] });
      }
      const jour = parJournee.get(l.journeeId)!;
      const nomPlat = `${l.selection.nomOverride ?? l.selection.repas.nom} — ${LABEL_TAILLE[l.taille]}`;
      const existant = jour.plats.find((p) => p.nom === nomPlat);
      if (existant) existant.compte += 1;
      else jour.plats.push({ nom: nomPlat, compte: 1 });
    }
  }
  const journees = Array.from(parJournee.values()).sort((a, b) => a.date.localeCompare(b.date));

  const allergies: AllergieRapport[] = commandes
    .filter((c) => c.enfant.intolerances.length > 0 || c.enfant.autreIntolerance)
    .map((c) => ({
      nom: `${c.enfant.prenom} ${c.enfant.nomDeFamille}`,
      detail: [...c.enfant.intolerances, c.enfant.autreIntolerance].filter(Boolean).join(', '),
    }));

  const logoTraiteur: PhotoResolue = await readFile(path.join(process.cwd(), 'public', 'logo.jpeg'))
    .then((data) => sharp(data).resize(120, 120, { fit: 'inside' }).flatten({ background: '#FFFFFF' }).jpeg({ quality: 78 }).toBuffer())
    .then((data) => ({ data, format: 'jpg' as const }))
    .catch(() => null);

  const buffer = await renderToBuffer(
    <RapportDocument
      institutionNom={menu.institution.nom}
      thematique={menu.thematiqueRef?.nom ?? null}
      logoTraiteur={logoTraiteur}
      journees={journees}
      allergies={allergies}
    />
  );

  const nomFichier = `rapport-${menu.institution.nom.replace(/[^a-z0-9]+/gi, '-')}-${menu.id.slice(-6)}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${nomFichier}"` },
  });
}
