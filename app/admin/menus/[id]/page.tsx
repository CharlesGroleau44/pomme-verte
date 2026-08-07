'use client';
// app/admin/menus/[id]/page.tsx
// La page la plus importante de ce module : c'est ici que l'utilisatrice
// va, journée par journée, choisir un repas dans l'inventaire — avec la
// possibilité de modifier à la volée SANS toucher au repas maître.
import { useEffect, useState } from 'react';

type Repas = { id: string; nom: string; description: string | null; photoUrl: string | null };
type Journee = {
  id: string;
  date: string;
  jourSemaine: string;
  repasId: string | null;
  nomOverride: string | null;
  descriptionOverride: string | null;
  seulementPourInstitutions: string[];
  repas: Repas | null;
};
type MenuDetail = {
  id: string;
  thematique: string | null;
  institutions: { institutionId: string; institution: { id: string; nom: string } }[];
  journees: Journee[];
  complet: boolean;
};

export default function MenuDetailPage({ params }: { params: { id: string } }) {
  const [menu, setMenu] = useState<MenuDetail | null>(null);
  const [repasInventaire, setRepasInventaire] = useState<Repas[]>([]);

  const charger = async () => {
    const [menuRes, repasRes] = await Promise.all([
      fetch(`/api/menus/${params.id}`),
      fetch('/api/repas'),
    ]);
    setMenu(await menuRes.json());
    setRepasInventaire(await repasRes.json());
  };

  useEffect(() => { charger(); }, [params.id]);

  const assignerRepas = async (journeeId: string, repasId: string) => {
    await fetch(`/api/menus/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ journeeId, repasId }),
    });
    charger();
  };

  const modifierOverride = async (journeeId: string, champ: 'nomOverride' | 'descriptionOverride', valeur: string) => {
    await fetch(`/api/menus/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ journeeId, [champ]: valeur }),
    });
    charger();
  };

  const reinitialiser = async (journeeId: string) => {
    await fetch(`/api/menus/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ journeeId, nomOverride: null, descriptionOverride: null, photoUrlOverride: null }),
    });
    charger();
  };

  if (!menu) return <p className="text-sm text-pomme-ink/40">Chargement…</p>;

  const multiInstitutions = menu.institutions.length > 1;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-pomme-leaf-deep truncate">{menu.thematique || 'Menu'}</h1>
        {menu.complet
          ? <span className="text-xs font-semibold text-status-good bg-status-good/10 px-2.5 py-1 rounded-full shrink-0">✓ Prêt</span>
          : <span className="text-xs font-semibold text-status-critical bg-status-critical/10 px-2.5 py-1 rounded-full shrink-0">Incomplet</span>}
      </div>

      <div className="space-y-3">
        {menu.journees.map((j) => {
          const estVide = !j.repasId;
          const estModifiee = Boolean(j.nomOverride || j.descriptionOverride);
          const nomEffectif = j.nomOverride ?? j.repas?.nom ?? '';
          const descEffective = j.descriptionOverride ?? j.repas?.description ?? '';

          return (
            <div key={j.id} className={`rounded-2xl p-4 border-2 ${estVide ? 'border-status-critical/30 bg-status-critical/5' : 'border-transparent bg-white shadow-card'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-sm font-bold text-pomme-ink sm:w-28 shrink-0">{j.jourSemaine} {new Date(j.date).getDate()}</span>
                <select
                  value={j.repasId ?? ''}
                  onChange={(e) => assignerRepas(j.id, e.target.value)}
                  className="flex-1 border border-pomme-line/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40 focus:border-pomme-apple-deep"
                >
                  <option value="" disabled>Choisir un repas…</option>
                  {repasInventaire.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
                </select>
                {estModifiee && (
                  <button onClick={() => reinitialiser(j.id)} className="text-xs font-medium text-status-warning border border-status-warning/40 rounded-lg px-2.5 py-1.5 shrink-0 hover:bg-status-warning/10 transition-colors">
                    Réinitialiser
                  </button>
                )}
              </div>

              {j.repasId && (
                <div className="mt-2.5 sm:pl-[7.5rem] space-y-1.5">
                  <input
                    value={nomEffectif}
                    onChange={(e) => modifierOverride(j.id, 'nomOverride', e.target.value)}
                    className="w-full border border-pomme-line/40 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                  />
                  <input
                    value={descEffective}
                    onChange={(e) => modifierOverride(j.id, 'descriptionOverride', e.target.value)}
                    className="w-full border border-pomme-line/40 rounded-lg px-2.5 py-1.5 text-xs text-pomme-ink/50"
                  />
                  {estModifiee && <span className="text-xs font-medium bg-status-warning/10 text-status-warning rounded-full px-2.5 py-0.5 inline-block">modifié pour cette journée</span>}
                </div>
              )}

              {multiInstitutions && (
                <div className="mt-2.5 sm:pl-[7.5rem] flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-pomme-ink/35">Applique à :</span>
                  {/* TODO Claude Code : brancher sur PATCH seulementPourInstitutions,
                      même logique que assignerRepas ci-dessus */}
                  {menu.institutions.map((mi) => (
                    <span key={mi.institutionId} className="text-xs bg-pomme-soft text-pomme-ink/60 rounded-full px-2.5 py-0.5">
                      {mi.institution.nom}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-pomme-ink/35">
        La publication (par institution) se fait depuis la liste des menus, une fois toutes les journées assignées.
      </p>
    </div>
  );
}
