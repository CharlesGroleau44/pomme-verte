// app/api/taches/rappel-date-limite/route.ts
// Rappel « dernière chance » : la veille de la date limite d'un menu,
// on écrit aux parents de cette école qui n'ont PAS encore commandé pour
// cet enfant. Ceux qui ont déjà commandé ne reçoivent rien — un rappel
// inutile est la façon la plus rapide de se faire marquer comme
// indésirable.
//
// Déclenché par cron sur le VPS (une fois par jour, le matin) :
//   curl -fsS -H "X-Tache-Secret: $TACHE_SECRET" \
//        https://menus.traiteurlapommeverte.com/api/taches/rappel-date-limite
//
// Protégé par un secret partagé plutôt que par la session admin : c'est
// une machine qui appelle, pas un humain connecté. Sans TACHE_SECRET
// configuré, la route refuse tout — jamais ouverte par défaut.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { envoyerRappelDateLimite } from '@/lib/courriels-envois';
import { SITE_URL } from '@/lib/courriel';

export const dynamic = 'force-dynamic';

/** Minuit UTC du jour civil de `d` — les dates de menu sont en @db.Date. */
function jourUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function GET(req: NextRequest) {
  const secret = process.env.TACHE_SECRET;
  if (!secret || req.headers.get('x-tache-secret') !== secret) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const demain = jourUTC(new Date());
  demain.setUTCDate(demain.getUTCDate() + 1);

  const menus = await prisma.menu.findMany({
    where: { publie: true, dateLimiteCommande: demain },
    include: { institution: true, thematiqueRef: true },
  });

  let envoyes = 0;
  const detail: { menuId: string; institution: string; rappels: number }[] = [];

  for (const menu of menus) {
    // Les enfants inscrits à cette école qui n'ont pas de commande sur ce
    // menu. `none` sur la relation : Prisma génère le NOT EXISTS, pas
    // besoin de ramener les commandes en mémoire pour filtrer.
    const enfants = await prisma.enfant.findMany({
      where: {
        institutionId: menu.institutionId,
        commandes: { none: { menuId: menu.id } },
      },
      include: { compteParent: true },
    });

    // Un parent avec deux enfants sans commande à la même école ne doit
    // recevoir qu'un seul courriel.
    const parents = new Map<string, { courriel: string; nom: string }>();
    for (const e of enfants) {
      parents.set(e.compteParent.id, { courriel: e.compteParent.courriel, nom: e.compteParent.nom });
    }

    for (const p of parents.values()) {
      await envoyerRappelDateLimite({
        a: p.courriel,
        nom: p.nom,
        thematique: menu.thematiqueRef?.nom ?? 'Menu',
        institutionNom: menu.institution.nom,
        institutionCourriel: menu.institution.courriel,
        dateLimite: menu.dateLimiteCommande,
        lienMenu: `${SITE_URL}/menus/${menu.institutionId}/${menu.id}`,
      });
      envoyes++;
    }

    detail.push({ menuId: menu.id, institution: menu.institution.nom, rappels: parents.size });
  }

  return NextResponse.json({ ok: true, date: demain.toISOString().slice(0, 10), menus: menus.length, envoyes, detail });
}
