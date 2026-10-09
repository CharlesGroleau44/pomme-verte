// app/api/institutions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Champs de la fiche institution — appliqués tels quels au create/update
// (voir aussi [id]/route.ts pour le PATCH).
const CHAMPS_FICHE = [
  'logoUrl', 'prospectusUrl', 'adresse', 'ville', 'province', 'codePostal',
  'telephone', 'courriel', 'siteWeb',
  'personneContact', 'telephoneContact', 'courrielContact',
  'notes', 'politiques',
] as const;

export async function GET() {
  const institutions = await prisma.institution.findMany({ orderBy: { nom: 'asc' } });
  return NextResponse.json(institutions);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.nom || typeof body.nom !== 'string') {
    return NextResponse.json({ error: 'Le nom de l\'institution est requis.' }, { status: 400 });
  }

  const data: Record<string, unknown> = { nom: body.nom };
  for (const champ of CHAMPS_FICHE) {
    if (champ in body) data[champ] = body[champ] || null;
  }
  // Booléens traités séparément — `body[champ] || null` transformerait
  // un `false` explicite en `null`, invalide pour un champ Boolean non-nullable.
  if ('offreFondation' in body) data.offreFondation = !!body.offreFondation;
  if ('offreFormatPetit' in body) data.offreFormatPetit = !!body.offreFormatPetit;
  if ('niveauxFormatPetit' in body) {
    data.niveauxFormatPetit = Array.isArray(body.niveauxFormatPetit) ? body.niveauxFormatPetit : [];
  }
  // Prix du repas dépannage : champ Decimal, traité à part car le formulaire
  // envoie une chaîne — vide signifie « pas de repas dépannage annoncé »,
  // pas « 0 $ ».
  if ('prixRepasDepannage' in body) {
    const brut = String(body.prixRepasDepannage ?? '').replace(',', '.').trim();
    data.prixRepasDepannage = brut === '' || Number.isNaN(Number(brut)) ? null : brut;
  }
  if ('calendrierScolaireId' in body) {
    data.calendrierScolaireId = body.calendrierScolaireId || null;
  }

  const institution = await prisma.institution.create({ data: data as { nom: string } });

  return NextResponse.json(institution, { status: 201 });
}
