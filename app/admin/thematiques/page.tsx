'use client';
// app/admin/thematiques/page.tsx
// Les thématiques vivent ici, pas sur chaque menu : elles changent une
// fois par mois environ et s'appliquent à toutes les institutions en
// même temps. Renommer une thématique ou changer sa mascotte met à jour
// TOUS les menus qui la portent, d'un seul coup.
import { useEffect, useState } from 'react';
import ChampPhoto from '../ChampPhoto';
import StatTile from '../dashboard/StatTile';
import { photo } from '@/lib/images';

type Thematique = {
  id: string;
  nom: string;
  photoUrl: string | null;
  createdAt: string;
  // Rang de cette thématique parmi toutes celles de même nom (calculé côté
  // serveur, jamais stocké — voir GET /api/thematiques) : « Petits Monstres »
  // d'un cycle à l'autre devient Petits Monstres 1, 2, 3…
  numero: number | null;
  _count: { menus: number };
};

export default function ThematiquesPage() {
  const [thematiques, setThematiques] = useState<Thematique[]>([]);
  const [charge, setCharge] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [erreur, setErreur] = useState('');
  const [editionId, setEditionId] = useState<string | null>(null);
  const [nomEdition, setNomEdition] = useState('');

  const charger = () => {
    fetch('/api/thematiques').then((r) => r.json()).then((d) => { setThematiques(d); setCharge(true); });
  };
  useEffect(charger, []);

  const creer = async () => {
    setErreur('');
    const res = await fetch('/api/thematiques', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, photoUrl }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      setErreur(error ?? 'Erreur inattendue.');
      return;
    }
    setNom('');
    setPhotoUrl(null);
    setShowForm(false);
    charger();
  };

  const modifier = async (id: string, data: { nom?: string; photoUrl?: string | null }) => {
    await fetch(`/api/thematiques/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    charger();
  };

  const enregistrerNom = async (t: Thematique) => {
    const nouveau = nomEdition.trim();
    setEditionId(null);
    if (!nouveau || nouveau === t.nom) return;
    await modifier(t.id, { nom: nouveau });
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up flex items-center justify-between">
        <h1 className="text-2xl font-display font-semibold text-pomme-leaf-deep">Thématiques</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="press bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf hover:shadow-lifted transition-all"
        >
          {showForm ? 'Annuler' : '+ Nouvelle thématique'}
        </button>
      </div>

      <p className="text-sm text-pomme-ink/65 max-w-2xl">
        Une thématique habille un cycle de menus — son nom et son image apparaissent à vos parents.
        Elle se crée <strong>une seule fois</strong> puis se choisit sur chaque menu.
        Changer son nom ou son image met à jour <strong>toutes les écoles d'un coup</strong>,
        sans rouvrir les menus un par un.
      </p>

      {charge && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatTile label="Thématiques" valeur={thematiques.length} />
          <StatTile label="Menus habillés" valeur={thematiques.reduce((n, t) => n + t._count.menus, 0)} />
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl shadow-card p-6 space-y-4">
          <label className="block text-sm font-medium text-pomme-ink/85">
            Nom de la thématique
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex. Passeport Gourmand"
              className="w-full border border-pomme-line/50 rounded-xl px-3.5 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40 focus:border-pomme-apple-deep"
            />
          </label>

          <ChampPhoto
            label="Image de la thématique (optionnel)"
            url={photoUrl}
            onChange={setPhotoUrl}
            taille={140}
            aide="Vos parents la voient sur la carte du menu et en haut de la page."
          />

          {erreur && <p className="text-xs font-semibold text-status-critical">{erreur}</p>}
          <button
            onClick={creer}
            disabled={!nom.trim()}
            className="bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf transition-colors disabled:opacity-50"
          >
            Créer la thématique
          </button>
        </div>
      )}

      <div className="space-y-3">
        {thematiques.map((t) => (
          <div key={t.id} className="bg-white rounded-2xl shadow-card p-5 flex items-center gap-4">
            {t.photoUrl ? (
              <img {...photo(t.photoUrl, 160)} loading="lazy" decoding="async" alt="" className="w-20 h-20 object-contain shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-pomme-soft shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              {editionId === t.id ? (
                <input
                  autoFocus
                  value={nomEdition}
                  onChange={(e) => setNomEdition(e.target.value)}
                  onBlur={() => enregistrerNom(t)}
                  onKeyDown={(e) => { if (e.key === 'Enter') enregistrerNom(t); }}
                  className="w-full border border-pomme-apple-deep rounded-lg px-3 py-1.5 text-base font-semibold"
                />
              ) : (
                <button
                  onClick={() => { setEditionId(t.id); setNomEdition(t.nom); }}
                  className="text-base font-semibold text-pomme-ink hover:text-pomme-apple-deep transition-colors text-left inline-flex items-center gap-1.5"
                  title="Cliquez pour renommer"
                >
                  {t.nom}
                  {t.numero && (
                    <span className="inline-flex items-center justify-center rounded-full bg-pomme-apple-light/40 text-pomme-leaf-deep text-xs font-bold px-2 py-0.5">
                      {t.numero}
                    </span>
                  )}
                </button>
              )}
              <div className="text-xs font-medium text-pomme-ink/60 mt-0.5">
                {t._count.menus === 0
                  ? 'Pas encore utilisée'
                  : `Utilisée par ${t._count.menus} menu${t._count.menus > 1 ? 's' : ''}`}
              </div>
            </div>
            <div className="shrink-0">
              <ChampPhoto
                label="Changer l'image"
                url={t.photoUrl}
                onChange={(url) => modifier(t.id, { photoUrl: url })}
                taille={64}
              />
            </div>
          </div>
        ))}
        {charge && thematiques.length === 0 && (
          <p className="text-sm text-pomme-ink/65 bg-white rounded-2xl shadow-card p-5">
            Aucune thématique pour le moment — créez-en une pour habiller vos prochains menus.
          </p>
        )}
      </div>
    </div>
  );
}
