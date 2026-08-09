'use client';
// app/admin/menus/[id]/page.tsx
// La page la plus importante de ce module : c'est ici que l'utilisatrice
// va, journée par journée, choisir jusqu'à 2 repas dans l'inventaire —
// avec la possibilité de modifier nom/description/prix à la volée SANS
// toucher au repas maître.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import CarteSelection, { type Selection } from './CarteSelection';
import { estActivementPublie, jourDuMoisUTC } from '@/lib/menu-logic';

type Repas = { id: string; nom: string };
type Journee = {
  id: string;
  date: string;
  jourSemaine: string;
  selections: Selection[];
};
type MenuDetail = {
  id: string;
  institutionId: string;
  thematique: string | null;
  publie: boolean;
  dateLimiteCommande: string;
  institution: { id: string; nom: string };
  journees: Journee[];
  complet: boolean;
};

export default function MenuDetailPage({ params }: { params: { id: string } }) {
  const [menu, setMenu] = useState<MenuDetail | null>(null);
  const [repasInventaire, setRepasInventaire] = useState<Repas[]>([]);
  const [ajoutEnCours, setAjoutEnCours] = useState<string | null>(null);

  const charger = async () => {
    const [menuRes, repasRes] = await Promise.all([
      fetch(`/api/menus/${params.id}`),
      fetch('/api/repas'),
    ]);
    setMenu(await menuRes.json());
    setRepasInventaire(await repasRes.json());
  };

  useEffect(() => { charger(); }, [params.id]);

  const ajouterSelection = async (journeeId: string, repasId: string) => {
    if (!repasId) return;
    setAjoutEnCours(journeeId);
    const res = await fetch(`/api/journees/${journeeId}/selections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repasId }),
    });
    setAjoutEnCours(null);
    if (!res.ok) {
      const { error } = await res.json();
      alert(error);
      return;
    }
    charger();
  };

  if (!menu) return <p className="text-sm text-pomme-ink/65">Chargement…</p>;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-pomme-leaf-deep truncate">{menu.thematique || 'Menu'}</h1>
          <p className="text-sm font-medium text-pomme-ink/65 truncate">{menu.institution.nom}</p>
        </div>
        {menu.complet ? (
          <Link
            href="/admin/menus"
            className="bg-status-good text-white rounded-xl px-5 py-3 text-base font-bold shadow-lifted hover:opacity-90 transition-opacity shrink-0"
          >
            ✓ Menu complété
          </Link>
        ) : (
          <span className="text-xs font-semibold text-status-critical bg-status-critical/10 px-2.5 py-1 rounded-full shrink-0">Incomplet</span>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        {estActivementPublie({ publie: menu.publie, dateLimiteCommande: new Date(menu.dateLimiteCommande) }) ? (
          <a
            href={`/menus/${menu.institutionId}/${menu.id}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-pomme-apple-deep hover:underline"
          >
            Voir le menu en ligne ↗
          </a>
        ) : (
          <span className="text-sm font-medium text-pomme-ink/40" title="Disponible une fois le menu publié">
            Voir le menu en ligne
          </span>
        )}
        <a
          href={`/api/menus/${menu.id}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-pomme-apple-deep hover:underline"
        >
          Voir le PDF ↗
        </a>
      </div>

      <div className="space-y-3">
        {menu.journees.map((j) => {
          const repasChoisisIds = j.selections.map((s) => s.repasId);
          const repasDisponibles = repasInventaire.filter((r) => !repasChoisisIds.includes(r.id));
          const peutAjouter = j.selections.length < 2;
          const estVide = j.selections.length === 0;

          return (
            <div key={j.id} className={`rounded-2xl p-4 border-2 ${estVide ? 'border-status-critical/30 bg-status-critical/5' : 'border-transparent bg-white shadow-card'}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold text-pomme-ink">{j.jourSemaine} {jourDuMoisUTC(j.date)}</span>
                {estVide && <span className="text-[10px] font-semibold text-status-critical bg-status-critical/10 px-2 py-0.5 rounded-full">Repas requis</span>}
              </div>

              <div className="space-y-2">
                {j.selections.map((s) => (
                  <CarteSelection key={s.id} selection={s} onChange={charger} />
                ))}
              </div>

              {peutAjouter && (
                <div className="mt-2.5">
                  <select
                    value=""
                    disabled={ajoutEnCours === j.id}
                    onChange={(e) => ajouterSelection(j.id, e.target.value)}
                    className="w-full border border-dashed border-pomme-line/60 rounded-xl px-3 py-2 text-sm text-pomme-ink/70 focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40 disabled:opacity-50"
                  >
                    <option value="" disabled>
                      {ajoutEnCours === j.id ? 'Ajout…' : estVide ? '+ Choisir un repas…' : '+ Ajouter un 2ᵉ repas (optionnel)…'}
                    </option>
                    {repasDisponibles.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs font-medium text-pomme-ink/60">
        La publication se fait depuis la liste des menus, une fois toutes les journées assignées.
      </p>
    </div>
  );
}
