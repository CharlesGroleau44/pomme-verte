'use client';
// app/admin/institutions/page.tsx
import { useEffect, useState } from 'react';

type Institution = {
  id: string;
  nom: string;
  logoUrl: string | null;
  actif: boolean;
};

const FORM_VIDE = { nom: '', logoUrl: '' };

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VIDE);

  const charger = async () => {
    const res = await fetch('/api/institutions');
    setInstitutions(await res.json());
  };

  useEffect(() => { charger(); }, []);

  const ouvrirCreation = () => {
    setEditingId(null);
    setForm(FORM_VIDE);
    setShowForm(true);
  };

  const ouvrirEdition = (i: Institution) => {
    setEditingId(i.id);
    setForm({ nom: i.nom, logoUrl: i.logoUrl ?? '' });
    setShowForm(true);
  };

  const soumettre = async () => {
    if (!form.nom.trim()) return;
    const payload = { nom: form.nom, logoUrl: form.logoUrl || null };

    if (editingId) {
      await fetch(`/api/institutions/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/institutions', {
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

  const toggleActif = async (i: Institution) => {
    await fetch(`/api/institutions/${i.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: !i.actif }),
    });
    charger();
  };

  const supprimer = async (id: string) => {
    const res = await fetch(`/api/institutions/${id}`, { method: 'DELETE' });
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
        <h1 className="text-lg font-semibold">Institutions</h1>
        <button
          onClick={() => (showForm ? setShowForm(false) : ouvrirCreation())}
          className="bg-emerald-800 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          {showForm ? 'Annuler' : '+ Nouvelle institution'}
        </button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 space-y-3">
          <input
            placeholder="Nom de l'institution (école, CPE, RPA…)"
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <input
            placeholder="URL du logo (facultatif)"
            value={form.logoUrl}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <button onClick={soumettre} className="bg-emerald-800 text-white rounded-lg px-4 py-2 text-sm font-medium">
            {editingId ? 'Enregistrer les modifications' : 'Ajouter l\'institution'}
          </button>
        </div>
      )}

      <div className="divide-y border rounded-lg">
        {institutions.map((i) => (
          <div key={i.id} className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {i.logoUrl && (
                <img src={i.logoUrl} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{i.nom}</div>
                <span className={`text-xs ${i.actif ? 'text-emerald-700' : 'text-gray-400'}`}>
                  {i.actif ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={() => toggleActif(i)} className="text-xs text-gray-600 hover:underline">
                {i.actif ? 'Désactiver' : 'Activer'}
              </button>
              <button onClick={() => ouvrirEdition(i)} className="text-xs text-emerald-700 hover:underline">
                Modifier
              </button>
              <button onClick={() => supprimer(i.id)} className="text-xs text-red-600 hover:underline">
                Supprimer
              </button>
            </div>
          </div>
        ))}
        {institutions.length === 0 && <p className="p-4 text-sm text-gray-500">Aucune institution pour le moment.</p>}
      </div>
    </div>
  );
}
