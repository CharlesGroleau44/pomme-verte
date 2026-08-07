'use client';
// app/admin/repas/page.tsx
import { useEffect, useState } from 'react';

type Repas = {
  id: string;
  nom: string;
  description: string | null;
  photoUrl: string | null;
  prixPetit: string;
  prixRegulier: string;
  prixDeuxiemeService: string;
};

export default function RepasPage() {
  const [repas, setRepas] = useState<Repas[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nom: '', description: '', prixPetit: '6.50', prixRegulier: '7.00', prixDeuxiemeService: '10.00',
  });

  const charger = async () => {
    const res = await fetch('/api/repas');
    setRepas(await res.json());
  };

  useEffect(() => { charger(); }, []);

  const soumettre = async () => {
    if (!form.nom.trim()) return;
    await fetch('/api/repas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom: form.nom,
        description: form.description,
        prixPetit: parseFloat(form.prixPetit),
        prixRegulier: parseFloat(form.prixRegulier),
        prixDeuxiemeService: parseFloat(form.prixDeuxiemeService),
      }),
    });
    setForm({ nom: '', description: '', prixPetit: '6.50', prixRegulier: '7.00', prixDeuxiemeService: '10.00' });
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
        <button onClick={() => setShowForm((s) => !s)} className="bg-emerald-800 text-white rounded-lg px-4 py-2 text-sm font-medium">
          {showForm ? 'Annuler' : '+ Nouveau repas'}
        </button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 space-y-3">
          <input placeholder="Nom du repas" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          <div className="grid grid-cols-3 gap-2">
            <input placeholder="Petit" value={form.prixPetit} onChange={(e) => setForm({ ...form, prixPetit: e.target.value })} className="border rounded px-3 py-2 text-sm" />
            <input placeholder="Régulier" value={form.prixRegulier} onChange={(e) => setForm({ ...form, prixRegulier: e.target.value })} className="border rounded px-3 py-2 text-sm" />
            <input placeholder="2e service" value={form.prixDeuxiemeService} onChange={(e) => setForm({ ...form, prixDeuxiemeService: e.target.value })} className="border rounded px-3 py-2 text-sm" />
          </div>
          {/* TODO Claude Code : ajouter l'upload de photo (photoUrl) — non branché dans ce démarrage */}
          <button onClick={soumettre} className="bg-emerald-800 text-white rounded-lg px-4 py-2 text-sm font-medium">Ajouter à l'inventaire</button>
        </div>
      )}

      <div className="divide-y border rounded-lg">
        {repas.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm font-medium">{r.nom}</div>
              <div className="text-xs text-gray-500">{r.description}</div>
              <div className="text-xs text-gray-400">
                Petit {r.prixPetit}$ · Régulier {r.prixRegulier}$ · 2e service {r.prixDeuxiemeService}$
              </div>
            </div>
            <button onClick={() => supprimer(r.id)} className="text-xs text-red-600">Supprimer</button>
          </div>
        ))}
        {repas.length === 0 && <p className="p-4 text-sm text-gray-500">Aucun repas pour le moment.</p>}
      </div>
    </div>
  );
}
