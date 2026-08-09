// app/api/commandes/route.ts
// Vue admin de toutes les commandes reçues — la version numérique du
// classeur de coupons-réponses papier. Protégée par le middleware
// admin par défaut (aucune exclusion pour ce chemin).
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const CHAMP_PRIX: Record<string, 'prixPetit' | 'prixRegulier' | 'prixDeuxiemeService'> = {
  PETIT: 'prixPetit',
  REGULIER: 'prixRegulier',
  DEUXIEME_SERVICE: 'prixDeuxiemeService',
};
const CHAMP_PRIX_OVERRIDE: Record<string, 'prixPetitOverride' | 'prixRegulierOverride' | 'prixDeuxiemeServiceOverride'> = {
  PETIT: 'prixPetitOverride',
  REGULIER: 'prixRegulierOverride',
  DEUXIEME_SERVICE: 'prixDeuxiemeServiceOverride',
};

export async function GET() {
  const commandes = await prisma.commande.findMany({
    include: {
      compteParent: true,
      enfant: { include: { institution: true } },
      menu: { include: { institution: true } },
      lignes: {
        include: { journee: true, selection: { include: { repas: true } } },
        orderBy: { journee: { date: 'asc' } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const resolues = commandes.map((c) => ({
    ...c,
    lignes: c.lignes.map((l) => {
      const nom = l.selection.nomOverride ?? l.selection.repas.nom;
      const prix = (l.selection[CHAMP_PRIX_OVERRIDE[l.taille]] ?? l.selection.repas[CHAMP_PRIX[l.taille]]).toString();
      return { ...l, nomResolu: nom, prixResolu: prix };
    }),
  }));

  return NextResponse.json(resolues);
}
