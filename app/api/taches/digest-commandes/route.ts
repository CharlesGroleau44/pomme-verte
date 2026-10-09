// app/api/taches/digest-commandes/route.ts
// Regroupe toutes les commandes reçues depuis le dernier envoi en UN SEUL
// courriel par école, plutôt qu'un avis à chaque commande — demandé par
// Christine (courriel du 16 août 2026 : « 51 courriels en 1 »).
//
// Repère les commandes via Commande.avisEcoleEnvoyeLe (null = jamais
// incluse). enregistrerCommande() remet ce champ à null chaque fois
// qu'une commande existante est modifiée (voir lib/commandes.ts) — elle
// redevient donc "en attente" et reparaît au digest suivant, sans qu'on
// ait besoin de comparer à updatedAt ici (ce qui se mordrait la queue :
// écrire avisEcoleEnvoyeLe avance aussi updatedAt).
//
// Déclenché par cron sur le VPS (une fois par jour, en fin de journée) :
//   curl -fsS -H "X-Tache-Secret: $TACHE_SECRET" \
//        https://menus.traiteurlapommeverte.com/api/taches/digest-commandes
//
// Même patron d'auth que les autres tâches planifiées — secret partagé,
// jamais ouvert par défaut.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { envoyerDigestCommandesInstitution } from '@/lib/courriels-envois';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = process.env.TACHE_SECRET;
  if (!secret || req.headers.get('x-tache-secret') !== secret) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const enAttente = await prisma.commande.findMany({
    where: { avisEcoleEnvoyeLe: null },
    include: { enfant: { include: { institution: true } } },
  });

  const parInstitution = new Map<string, { nom: string; courriel: string | null; commandeIds: string[] }>();
  for (const c of enAttente) {
    const inst = c.enfant.institution;
    if (!parInstitution.has(inst.id)) {
      parInstitution.set(inst.id, { nom: inst.nom, courriel: inst.courriel, commandeIds: [] });
    }
    parInstitution.get(inst.id)!.commandeIds.push(c.id);
  }

  const maintenant = new Date();
  const detail: { institution: string; commandes: number }[] = [];

  for (const { nom, courriel, commandeIds } of parInstitution.values()) {
    await envoyerDigestCommandesInstitution(nom, courriel, commandeIds);
    await prisma.commande.updateMany({
      where: { id: { in: commandeIds } },
      data: { avisEcoleEnvoyeLe: maintenant },
    });
    detail.push({ institution: nom, commandes: commandeIds.length });
  }

  return NextResponse.json({ ok: true, institutions: parInstitution.size, commandes: enAttente.length, detail });
}
