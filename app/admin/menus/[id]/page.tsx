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
import { photo } from '@/lib/images';

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
  thematiqueId: string | null;
  thematiqueRef: { id: string; nom: string; photoUrl: string | null } | null;
  publie: boolean;
  dateLimiteCommande: string;
  datePublication: string | null;
  institution: { id: string; nom: string };
  journees: Journee[];
  complet: boolean;
};

type Thematique = { id: string; nom: string; photoUrl: string | null };

export default function MenuDetailPage({ params }: { params: { id: string } }) {
  const [menu, setMenu] = useState<MenuDetail | null>(null);
  const [repasInventaire, setRepasInventaire] = useState<Repas[]>([]);
  const [thematiques, setThematiques] = useState<Thematique[]>([]);
  const [ajoutEnCours, setAjoutEnCours] = useState<string | null>(null);

  const charger = async () => {
    const [menuRes, repasRes, themeRes] = await Promise.all([
      fetch(`/api/menus/${params.id}`),
      fetch('/api/repas'),
      fetch('/api/thematiques'),
    ]);
    setMenu(await menuRes.json());
    setRepasInventaire(await repasRes.json());
    setThematiques(await themeRes.json());
  };

  useEffect(() => { charger(); }, [params.id]);

  // Le menu pointe vers une thématique partagée : on change ici le
  // RATTACHEMENT, pas le nom ni l'image (qui se modifient une seule fois
  // dans /admin/thematiques et se propagent à toutes les écoles).
  const changerThematique = async (thematiqueId: string | null) => {
    await fetch(`/api/menus/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thematiqueId }),
    });
    charger();
  };

  const changerDatePublication = async (datePublication: string | null) => {
    await fetch(`/api/menus/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datePublication }),
    });
    charger();
  };

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
          <h1 className="text-2xl font-extrabold text-pomme-leaf-deep truncate">{menu.thematiqueRef?.nom || 'Menu'}</h1>
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
        {estActivementPublie({
          publie: menu.publie,
          dateLimiteCommande: new Date(menu.dateLimiteCommande),
          datePublication: menu.datePublication ? new Date(menu.datePublication) : null,
        }) ? (
          <a
            href={`/menus/${menu.institutionId}/${menu.id}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-pomme-apple-deep hover:underline"
          >
            Voir le menu en ligne ↗
          </a>
        ) : (
          <span
            className="text-sm font-medium text-pomme-ink/40"
            title={
              menu.publie && menu.datePublication && new Date() < new Date(menu.datePublication)
                ? `S'ouvrira automatiquement le ${new Date(menu.datePublication).toLocaleDateString('fr-CA', { timeZone: 'UTC' })}`
                : 'Disponible une fois le menu publié'
            }
          >
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

      <div className="bg-white rounded-2xl shadow-card p-5">
        <span className="block text-sm font-semibold text-pomme-ink/85 mb-1">Thématique</span>
        <p className="text-xs text-pomme-ink/60 mb-3">
          Pour changer le nom ou l&apos;image d&apos;une thématique — ce qui met à jour toutes les
          écoles d&apos;un coup — passez par{' '}
          <Link href="/admin/thematiques" className="text-pomme-apple-deep font-semibold hover:underline">Thématiques</Link>.
        </p>
        {thematiques.length === 0 ? (
          <p className="text-xs font-medium text-pomme-ink/60">
            Aucune thématique créée pour l&apos;instant.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {thematiques.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => changerThematique(menu.thematiqueId === t.id ? null : t.id)}
                className={`inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  menu.thematiqueId === t.id
                    ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep'
                    : 'bg-white border-pomme-line/60 text-pomme-ink/85 hover:border-pomme-apple-deep'
                }`}
              >
                {t.photoUrl && <img {...photo(t.photoUrl, 160)} alt="" className="w-6 h-6 object-contain" />}
                {t.nom}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-card p-5">
        <span className="block text-sm font-semibold text-pomme-ink/85 mb-1">Date de publication</span>
        <p className="text-xs text-pomme-ink/60 mb-3">
          Le menu reste invisible aux parents jusqu&rsquo;à cette date, puis s&rsquo;ouvre automatiquement — utile
          pour un menu construit à l&rsquo;avance. Laissez vide pour qu&rsquo;il soit visible dès que publié.
        </p>
        <input
          type="date"
          value={menu.datePublication ? menu.datePublication.slice(0, 10) : ''}
          onChange={(e) => changerDatePublication(e.target.value || null)}
          className="border border-pomme-line/50 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40"
        />
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
