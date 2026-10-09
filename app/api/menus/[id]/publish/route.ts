// app/api/menus/[id]/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { menuEstComplet, finDeJournee } from '@/lib/menu-logic';

/**
 * Bascule la publication d'un menu — un seul bouton, puisqu'un menu
 * n'appartient qu'à une seule institution (voir schema.prisma).
 *
 * Refuse la publication (mais autorise toujours la dépublication) si
 * des journées n'ont pas encore de repas assigné, OU si la date limite
 * de commande est déjà passée (republier exigerait d'abord de la
 * repousser — sans quoi le menu redeviendrait immédiatement invisible,
 * voir estActivementPublie()).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  // Attendu : { publie: boolean }

  if (typeof body.publie !== 'boolean') {
    return NextResponse.json({ error: 'publie (booléen) est requis.' }, { status: 400 });
  }

  if (body.publie) {
    const menu = await prisma.menu.findUnique({
      where: { id: params.id },
      include: { journees: { include: { selections: true } } },
    });
    if (!menu) return NextResponse.json({ error: 'Menu introuvable.' }, { status: 404 });

    if (!menuEstComplet(menu.journees)) {
      return NextResponse.json(
        { error: 'Impossible de publier : au moins une journée du menu n\'a pas de repas assigné.' },
        { status: 422 }
      );
    }
    if (new Date() > finDeJournee(menu.dateLimiteCommande)) {
      return NextResponse.json(
        { error: 'La date limite de commande de ce menu est déjà passée — repoussez-la avant de publier.' },
        { status: 422 }
      );
    }

    // La règle habituelle de Christine (courriel du 10 août 2026) : la date
    // limite tombe le vendredi/samedi minuit AVANT le repas du lundi. Une
    // date limite le jour même du premier repas est donc suspecte…
    //
    // …mais pas interdite : elle a une exception assumée pour le PREMIER
    // menu de l'année, où les commandes sont acceptées jusqu'au jour 1.
    // D'où une confirmation plutôt qu'un refus — on attrape la faute de
    // frappe sans bloquer un cas légitime. L'interface redemande, puis
    // renvoie confirmerDateLimite (voir app/admin/menus/page.tsx).
    const premierJour = menu.journees.reduce<Date | null>(
      (min, j) => (min === null || j.date < min ? j.date : min),
      null
    );
    if (premierJour && menu.dateLimiteCommande >= premierJour && !body.confirmerDateLimite) {
      const fmt = (d: Date) =>
        d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', timeZone: 'UTC' });
      return NextResponse.json(
        {
          code: 'DATE_LIMITE_APRES_PREMIER_REPAS',
          error:
            `La date limite de commande (${fmt(menu.dateLimiteCommande)}) tombe le jour du premier ` +
            `repas servi (${fmt(premierJour)}) ou après — la cuisine n'a donc aucun délai de préparation.\n\n` +
            `C'est normal pour le premier menu de l'année, où les commandes sont acceptées jusqu'au jour 1. ` +
            `Sinon, reculez la date limite au vendredi précédent.\n\n` +
            `Publier quand même ?`,
        },
        { status: 422 }
      );
    }
  }

  const menu = await prisma.menu.update({
    where: { id: params.id },
    data: { publie: body.publie },
    include: { institution: true },
  });

  return NextResponse.json(menu);
}
