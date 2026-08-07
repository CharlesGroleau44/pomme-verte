'use client';
// app/admin/repas/page.tsx
import { useEffect, useState } from 'react';
import ChampPhoto from './ChampPhoto';

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Repas</h1>
        <button
          onClick={() => (showForm ? setShowForm(false) : ouvrirCreation())}
          className="bg-emerald-800 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          {showForm ? 'Annuler' : '+ Nouveau repas'}
        </button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 space-y-4">
          <input
            placeholder="Nom du repas"
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
          />

          <div>
            <span className="block text-sm mb-1">Photos</span>
            <div className="flex gap-3">
              <ChampPhoto label="Principale" url={form.photoUrl} onChange={(url) => setForm({ ...form, photoUrl: url })} />
              <ChampPhoto label="Photo 2" url={form.photoUrl2} onChange={(url) => setForm({ ...form, photoUrl2: url })} />
              <ChampPhoto label="Photo 3" url={form.photoUrl3} onChange={(url) => setForm({ ...form, photoUrl3: url })} />
            </div>
          </div>

          <div>
            <span className="block text-sm mb-1">Prix par format</span>
            <div className="grid grid-cols-3 gap-2">
              <label className="block text-xs text-gray-500">
                Petit repas
                <input value={form.prixPetit} onChange={(e) => setForm({ ...form, prixPetit: e.target.value })} className="w-full border rounded px-3 py-2 text-sm mt-1" />
              </label>
              <label className="block text-xs text-gray-500">
                Repas régulier
                <input value={form.prixRegulier} onChange={(e) => setForm({ ...form, prixRegulier: e.target.value })} className="w-full border rounded px-3 py-2 text-sm mt-1" />
              </label>
              <label className="block text-xs text-gray-500">
                Repas + 2ᵉ service
                <input value={form.prixDeuxiemeService} onChange={(e) => setForm({ ...form, prixDeuxiemeService: e.target.value })} className="w-full border rounded px-3 py-2 text-sm mt-1" />
              </label>
            </div>
          </div>

          <div>
            <span className="block text-sm mb-1">Institutions</span>
            <p className="text-xs text-gray-400 mb-1.5">Aucune sélection = disponible pour toutes les institutions.</p>
            <div className="flex flex-wrap gap-2">
              {institutions.filter((i) => i.actif).map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => toggleInstitution(i.id)}
                  className={`px-3 py-1.5 rounded-full text-xs border ${form.institutionIds.includes(i.id) ? 'bg-emerald-800 text-white border-emerald-800' : 'bg-white border-gray-300'}`}
                >
                  {i.nom}
                </button>
              ))}
            </div>
          </div>

          <button onClick={soumettre} className="bg-emerald-800 text-white rounded-lg px-4 py-2 text-sm font-medium">
            {editingId ? 'Enregistrer les modifications' : 'Ajouter à l\'inventaire'}
          </button>
        </div>
      )}

      <div className="divide-y border rounded-lg">
        {repas.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {r.photoUrl && <img src={r.photoUrl} alt="" className="w-12 h-12 object-cover rounded-lg border shrink-0" />}
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{r.nom}</div>
                <div className="text-xs text-gray-500 truncate">{r.description}</div>
                <div className="text-xs text-gray-400">
                  Petit repas {r.prixPetit}$ · Repas régulier {r.prixRegulier}$ · Repas + 2ᵉ service {r.prixDeuxiemeService}$
                </div>
                {r.institutions.length > 0 && (
                  <div className="text-xs text-emerald-700 mt-0.5">{r.institutions.length} institution(s) seulement</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={() => ouvrirEdition(r)} className="text-xs text-emerald-700 hover:underline">Modifier</button>
              <button onClick={() => supprimer(r.id)} className="text-xs text-red-600 hover:underline">Supprimer</button>
            </div>
          </div>
        ))}
        {repas.length === 0 && <p className="p-4 text-sm text-gray-500">Aucun repas pour le moment.</p>}
      </div>
    </div>
  );
}
