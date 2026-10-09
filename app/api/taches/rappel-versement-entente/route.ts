// app/api/taches/rappel-versement-entente/route.ts
// Rappel automatique du 2e versement de l'entente annuelle (voir
// lib/entente.ts) — un parent en 2 versements dont le 2e n'est pas encore
// marqué reçu (voir /admin/parents) reçoit un courriel :
//   - un premier préavis dès 14 jours avant l'échéance
//   - puis un rappel toutes les semaines tant qu'il n'est pas réglé
// Déclenché par cron sur le VPS, même patron que /api/taches/rappel-date-limite :
//   curl -fsS -H "X-Tache-Secret: $TACHE_SECRET" \
//        https://menus.traiteurlapommeverte.com/api/taches/rappel-versement-entente
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { envoyerRappelVersementEntente } from '@/lib/courriels-envois';
import { etatVersement } from '@/lib/entente';

export const dynamic = 'force-dynamic';

const JOURS_ENTRE_RAPPELS = 7;

export async function GET(req: NextRequest) {
  const secret = process.env.TACHE_SECRET;
  if (!secret || req.headers.get('x-tache-secret') !== secret) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const aujourdhui = new Date();
  // Entente par enfant depuis le 17 août 2026 (voir lib/entente.ts) — un
  // même parent peut avoir plusieurs enfants avec des échéances distinctes.
  const candidats = await prisma.enfant.findMany({
    where: {
      prepayeAnnuel: true,
      ententeVersements: 2,
      ententeVerse2Paye: false,
      ententeDate2eVersement: { not: null },
    },
    include: { compteParent: true, institution: true },
  });

  let envoyes = 0;
  for (const e of candidats) {
    const etat = etatVersement(e.ententeDate2eVersement, e.ententeVerse2Paye, aujourdhui);
    if (!etat || !etat.approche) continue;

    const joursDepuisDernierRappel = e.ententeDernierRappelEnvoye
      ? Math.floor((aujourdhui.getTime() - e.ententeDernierRappelEnvoye.getTime()) / 86_400_000)
      : Infinity;
    if (joursDepuisDernierRappel < JOURS_ENTRE_RAPPELS) continue;

    await envoyerRappelVersementEntente({
      a: e.compteParent.courriel,
      nom: e.compteParent.nom,
      enfantNom: `${e.prenom} ${e.nomDeFamille}`,
      institutionCourriel: e.institution.courriel,
      montant: etat.montant,
      dateEcheance: etat.dateEcheance,
      enRetard: etat.enRetard,
    });
    await prisma.enfant.update({ where: { id: e.id }, data: { ententeDernierRappelEnvoye: aujourdhui } });
    envoyes++;
  }

  return NextResponse.json({ ok: true, candidats: candidats.length, envoyes });
}
