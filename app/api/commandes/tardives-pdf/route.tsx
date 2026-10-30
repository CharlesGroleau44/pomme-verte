// app/api/commandes/tardives-pdf/route.tsx
// Fiche imprimable des commandes tardives d'une journée (?date=AAAA-MM-JJ,
// aujourd'hui par défaut), une page par école. Admin seulement (middleware
// par défaut). Voir lib/pdf/TardivesDocument.tsx.
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { aujourdhuiQuebec, prixLigne, selectionVersTexte } from '@/lib/menu-logic';
import { soldeDu } from '@/lib/paiement';
import { cleEleve } from '@/lib/normalisation';
import { chargerLogoTraiteur } from '@/lib/pdf/logoTraiteur';
import { LABEL_PAIEMENT } from '@/lib/pdf/rapportStyles';
import TardivesDocument, { type EcoleTardive } from '@/lib/pdf/TardivesDocument';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') || aujourdhuiQuebec();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date doit être au format AAAA-MM-JJ.' }, { status: 400 });
  }

  const lignes = await prisma.ligneCommande.findMany({
    where: { tardive: true, journee: { date: new Date(`${date}T00:00:00Z`) } },
    include: {
      selection: { include: { repas: true } },
      commande: {
        include: {
          compteParent: true,
          enfant: { include: { institution: true } },
          lignes: { include: { selection: { include: { repas: true } } } },
        },
      },
    },
  });

  // Groupe-classe du préscolaire (« 0.N.R »…) quand le registre le connaît —
  // même écriture que la colonne N de la feuille cuisine.
  const institutionIds = [...new Set(lignes.map((l) => l.commande.enfant.institutionId))];
  const registre = institutionIds.length
    ? await prisma.eleveRegistre.findMany({ where: { institutionId: { in: institutionIds }, groupe: { not: null } } })
    : [];
  const groupeParCle = new Map(registre.map((e) => [`${e.institutionId}|${cleEleve(e.nom, e.prenom, e.niveau)}`, e.groupe!]));

  const parEcole = new Map<string, EcoleTardive>();
  for (const l of lignes) {
    const c = l.commande;
    const e = c.enfant;
    const nomEcole = e.institution.nom;
    if (!parEcole.has(nomEcole)) parEcole.set(nomEcole, { institutionNom: nomEcole, eleves: [] });
    const totalCommande = c.lignes.reduce((s, x) => s + prixLigne(x, selectionVersTexte(x.selection)), 0);
    const groupe = groupeParCle.get(`${e.institutionId}|${cleEleve(e.nomDeFamille, e.prenom, e.niveau)}`);
    parEcole.get(nomEcole)!.eleves.push({
      nom: e.nomDeFamille,
      prenom: e.prenom,
      niveau: e.niveau === 'Préscolaire' ? (groupe ?? '0') : e.niveau,
      allergies: [...e.intolerances, e.autreIntolerance].filter(Boolean).join(', '),
      parent: c.compteParent.nom,
      telephone: c.compteParent.telephone ?? '',
      paiement: LABEL_PAIEMENT[c.modePaiement] ?? c.modePaiement,
      repas: prixLigne(l, selectionVersTexte(l.selection)),
      aEncaisser: soldeDu(c, totalCommande),
    });
  }

  const ecoles = [...parEcole.values()]
    .sort((a, b) => a.institutionNom.localeCompare(b.institutionNom, 'fr'))
    .map((e) => ({
      ...e,
      eleves: e.eleves.sort(
        (a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }) || a.prenom.localeCompare(b.prenom, 'fr', { sensitivity: 'base' }),
      ),
    }));

  const dateTexte = new Date(`${date}T00:00:00Z`).toLocaleDateString('fr-CA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
  const buffer = await renderToBuffer(<TardivesDocument logo={await chargerLogoTraiteur()} dateTexte={dateTexte} ecoles={ecoles} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="commandes-tardives-${date}.pdf"` },
  });
}
