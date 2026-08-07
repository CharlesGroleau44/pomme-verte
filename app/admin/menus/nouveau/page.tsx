'use client';
// app/admin/menus/nouveau/page.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Ecole = { id: string; nom: string; actif: boolean };

export default function NouveauMenuPage() {
  const router = useRouter();
  const [ecoles, setEcoles] = useState<Ecole[]>([]);
  const [debut, setDebut] = useState('');
  const [fin, setFin] = useState('');
  const [thematique, setThematique] = useState('');
  const [dateLimite, setDateLimite] = useState('');
  const [ecoleIds, setEcoleIds] = useState<string[]>([]);

  useEffect(() => {
    // TODO Claude Code : route GET /api/ecoles n'existe pas encore
    // dans ce démarrage (module Écoles = prochain module). En
    // attendant, brancher directement sur prisma.ecole.findMany
    // via une route API minimale, ou seed + fetch direct.
    fetch('/api/ecoles').then((r) => r.json()).then(setEcoles).catch(() => setEcoles([]));
  }, []);

  const toggleEcole = (id: string) => {
    setEcoleIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const creer = async () => {
    if (!debut || !fin || ecoleIds.length === 0) {
      alert('Date de début, date de fin et au moins une école sont requis.');
      return;
    }
    const res = await fetch('/api/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        periodeDebut: debut,
        periodeFin: fin,
        thematique,
        dateLimiteCommande: dateLimite || null,
        ecoleIds,
      }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      alert(error);
      return;
    }
    const menu = await res.json();
    router.push(`/admin/menus/${menu.id}`); // direction : assignation des repas par journée
  };

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold">Nouveau menu</h1>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          Date de début
          <input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} className="w-full border rounded px-3 py-2 text-sm mt-1" />
        </label>
        <label className="block text-sm">
          Date de fin
          <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} className="w-full border rounded px-3 py-2 text-sm mt-1" />
        </label>
      </div>

      <label className="block text-sm">
        Thématique
        <input value={thematique} onChange={(e) => setThematique(e.target.value)} className="w-full border rounded px-3 py-2 text-sm mt-1" />
      </label>

      <label className="block text-sm">
        Date limite de commande
        <input type="date" value={dateLimite} onChange={(e) => setDateLimite(e.target.value)} className="w-full border rounded px-3 py-2 text-sm mt-1" />
      </label>

      <div>
        <span className="block text-sm mb-1">Écoles</span>
        <div className="flex flex-wrap gap-2">
          {ecoles.filter((e) => e.actif).map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => toggleEcole(e.id)}
              className={`px-3 py-1.5 rounded-full text-xs border ${ecoleIds.includes(e.id) ? 'bg-emerald-800 text-white border-emerald-800' : 'bg-white border-gray-300'}`}
            >
              {e.nom}
            </button>
          ))}
        </div>
      </div>

      <button onClick={creer} className="bg-emerald-800 text-white rounded-lg px-4 py-2 text-sm font-medium">
        Créer le menu et générer les journées
      </button>
    </div>
  );
}
