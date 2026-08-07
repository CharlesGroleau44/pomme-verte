'use client';
// app/admin/repas/page.tsx
import { useEffect, useState } from 'react';
import ChampPhoto from '../ChampPhoto';
import StatTile from '../dashboard/StatTile';
import TendanceHebdo from '../dashboard/TendanceHebdo';
import EntreesRecentes from '../dashboard/EntreesRecentes';

type Repas = {
  id: string;
  nom: string;
  description: string | null;
  photoUrl: string | null;
  photoUrl2: string | null;
  photoUrl3: string | null;
  prixPetit: string;
  prixRegulier: string;
  prixDeuxiemeService: string;
  institutions: { id: string }[];
  createdAt: string;
};

type Institution = { id: string; nom: string; actif: boolean };

const FORM_VIDE = {
  nom: '',
  description: '',
  photoUrl: null as string | null,
  photoUrl2: null as string | null,
  photoUrl3: null as string | null,
  prixPetit: '6.50',
  prixRegulier: '7.00',
  prixDeuxiemeService: '10.00',
  institutionIds: [] as string[],
};

export default function RepasPage() {
  const [repas, setRepas] = useState<Repas[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [charge, setCharge] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VIDE);

  const charger = async () => {
    const [repasRes, institutionsRes] = await Promise.all([
      fetch('/api/repas'),
      fetch('/api/institutions'),
    ]);
    setRepas(await repasRes.json());
    setInstitutions(await institutionsRes.json());
    setCharge(true);
  };

  useEffect(() => { charger(); }, []);

  const ouvrirCreation = () => {
    setEditingId(null);
    setForm(FORM_VIDE);
    setShowForm(true);
  };

  const ouvrirEdition = (r: Repas) => {
    setEditingId(r.id);
    setForm({
      nom: r.nom,
      description: r.description ?? '',
      photoUrl: r.photoUrl,
      photoUrl2: r.photoUrl2,
      photoUrl3: r.photoUrl3,
      prixPetit: r.prixPetit,
      prixRegulier: r.prixRegulier,
      prixDeuxiemeService: r.prixDeuxiemeService,
      institutionIds: r.institutions.map((i) => i.id),
    });
    setShowForm(true);
  };

  const toggleInstitution = (id: string) => {
    setForm((f) => ({
      ...f,
      institutionIds: f.institutionIds.includes(id)
        ? f.institutionIds.filter((x) => x !== id)
        : [...f.institutionIds, id],
    }));
  };

  const soumettre = async () => {
    if (!form.nom.trim()) return;
    const payload = {
      nom: form.nom,
      description: form.description,
      photoUrl: form.photoUrl,
      photoUrl2: form.photoUrl2,
      photoUrl3: form.photoUrl3,
      prixPetit: parseFloat(form.prixPetit),
      prixRegulier: parseFloat(form.prixRegulier),
      prixDeuxiemeService: parseFloat(form.prixDeuxiemeService),
      institutionIds: form.institutionIds,
    };

    if (editingId) {
      await fetch(`/api/repas/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/repas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    setForm(FORM_VIDE);
    setEditingId(null);
    setShowForm(false);
    charger();
  };

  const supprimer = async (id: string) => {
    const res = await fetch(`/api/repas/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const { error } = await res.json();
      alert(error); // TODO Claude Code : remplacer par une notification UI
      return;
    }
    charger();
  };

  const prixMoyen = repas.length
    ? (repas.reduce((acc, r) => acc + parseFloat(r.prixRegulier), 0) / repas.length).toFixed(2)
    : '0.00';

  const recents = [...repas]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      titre: r.nom,
      sousTitre: `${r.prixRegulier}$ · Repas régulier`,
      date: new Date(r.createdAt),
      vignette: r.photoUrl,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-pomme-leaf-deep">Repas</h1>
        <button
          onClick={() => (showForm ? setShowForm(false) : ouvrirCreation())}
          className="bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf transition-colors"
        >
          {showForm ? 'Annuler' : '+ Nouveau repas'}
        </button>
      </div>

      {charge && !showForm && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatTile label="Repas à l'inventaire" valeur={repas.length} />
            <StatTile label="Prix régulier moyen" valeur={`${prixMoyen} $`} />
            <StatTile label="Restreints à des institutions" valeur={repas.filter((r) => r.institutions.length > 0).length} sousTexte="sur le total de l'inventaire" />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <TendanceHebdo titre="Repas ajoutés à l'inventaire" dates={repas.map((r) => new Date(r.createdAt))} />
            </div>
            <EntreesRecentes titre="Récemment ajoutés" entrees={recents} />
          </div>
        </>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl shadow-card p-6 space-y-5">
          <input
            placeholder="Nom du repas"
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            className="w-full border border-pomme-line/50 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40 focus:border-pomme-apple-deep"
          />
          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-pomme-line/50 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40 focus:border-pomme-apple-deep"
          />

          <div>
            <span className="block text-sm font-semibold text-pomme-ink/70 mb-2">Photos</span>
            <div className="flex gap-3">
              <ChampPhoto label="Principale" url={form.photoUrl} onChange={(url) => setForm({ ...form, photoUrl: url })} />
              <ChampPhoto label="Photo 2" url={form.photoUrl2} onChange={(url) => setForm({ ...form, photoUrl2: url })} />
              <ChampPhoto label="Photo 3" url={form.photoUrl3} onChange={(url) => setForm({ ...form, photoUrl3: url })} />
            </div>
          </div>

          <div>
            <span className="block text-sm font-semibold text-pomme-ink/70 mb-2">Prix par format</span>
            <div className="grid grid-cols-3 gap-2">
              <label className="block text-xs text-pomme-ink/50">
                Petit repas
                <input value={form.prixPetit} onChange={(e) => setForm({ ...form, prixPetit: e.target.value })} className="w-full border border-pomme-line/50 rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40" />
              </label>
              <label className="block text-xs text-pomme-ink/50">
                Repas régulier
                <input value={form.prixRegulier} onChange={(e) => setForm({ ...form, prixRegulier: e.target.value })} className="w-full border border-pomme-line/50 rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40" />
              </label>
              <label className="block text-xs text-pomme-ink/50">
                Repas + 2ᵉ service
                <input value={form.prixDeuxiemeService} onChange={(e) => setForm({ ...form, prixDeuxiemeService: e.target.value })} className="w-full border border-pomme-line/50 rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40" />
              </label>
            </div>
          </div>

          <div>
            <span className="block text-sm font-semibold text-pomme-ink/70 mb-1">Institutions</span>
            <p className="text-xs text-pomme-ink/40 mb-2">Aucune sélection = disponible pour toutes les institutions.</p>
            <div className="flex flex-wrap gap-2">
              {institutions.filter((i) => i.actif).map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => toggleInstitution(i.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    form.institutionIds.includes(i.id)
                      ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep'
                      : 'bg-white border-pomme-line/60 text-pomme-ink/70 hover:border-pomme-apple-deep'
                  }`}
                >
                  {i.nom}
                </button>
              ))}
            </div>
          </div>

          <button onClick={soumettre} className="bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf transition-colors">
            {editingId ? 'Enregistrer les modifications' : 'Ajouter à l\'inventaire'}
          </button>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-pomme-ink/50 uppercase tracking-wide mb-2">Tout l&rsquo;inventaire</h2>
        <div className="bg-white rounded-2xl shadow-card divide-y divide-pomme-soft overflow-hidden">
          {repas.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-3.5 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {r.photoUrl ? (
                  <img src={r.photoUrl} alt="" className="w-12 h-12 object-cover rounded-xl border border-pomme-soft shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-pomme-soft shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{r.nom}</div>
                  <div className="text-xs text-pomme-ink/50 truncate">{r.description}</div>
                  <div className="text-xs text-pomme-ink/35">
                    Petit repas {r.prixPetit}$ · Repas régulier {r.prixRegulier}$ · Repas + 2ᵉ service {r.prixDeuxiemeService}$
                  </div>
                  {r.institutions.length > 0 && (
                    <div className="text-xs text-pomme-apple-deep font-medium mt-0.5">{r.institutions.length} institution(s) seulement</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => ouvrirEdition(r)} className="text-xs font-medium text-pomme-apple-deep hover:underline">Modifier</button>
                <button onClick={() => supprimer(r.id)} className="text-xs font-medium text-status-critical hover:underline">Supprimer</button>
              </div>
            </div>
          ))}
          {charge && repas.length === 0 && <p className="p-5 text-sm text-pomme-ink/40">Aucun repas pour le moment.</p>}
        </div>
      </div>
    </div>
  );
}
