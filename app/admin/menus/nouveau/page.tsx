'use client';
// app/admin/menus/nouveau/page.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Institution = { id: string; nom: string; actif: boolean };

const INPUT = 'w-full border border-pomme-line/50 rounded-xl px-3.5 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40 focus:border-pomme-apple-deep transition-shadow';

export default function NouveauMenuPage() {
  const router = useRouter();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [debut, setDebut] = useState('');
  const [fin, setFin] = useState('');
  const [thematique, setThematique] = useState('');
  const [dateLimite, setDateLimite] = useState('');
  const [institutionIds, setInstitutionIds] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/institutions').then((r) => r.json()).then(setInstitutions).catch(() => setInstitutions([]));
  }, []);

  const toggleInstitution = (id: string) => {
    setInstitutionIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const creer = async () => {
    if (!debut || !fin || institutionIds.length === 0) {
      alert('Date de début, date de fin et au moins une institution sont requis.');
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
        institutionIds,
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
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-extrabold text-pomme-leaf-deep">Nouveau menu</h1>

      <div className="bg-white rounded-2xl shadow-card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-pomme-ink/85">
            Date de début
            <input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} className={INPUT} />
          </label>
          <label className="block text-sm font-medium text-pomme-ink/85">
            Date de fin
            <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} className={INPUT} />
          </label>
        </div>

        <label className="block text-sm font-medium text-pomme-ink/85">
          Thématique
          <input value={thematique} onChange={(e) => setThematique(e.target.value)} className={INPUT} />
        </label>

        <label className="block text-sm font-medium text-pomme-ink/85">
          Date limite de commande
          <input type="date" value={dateLimite} onChange={(e) => setDateLimite(e.target.value)} className={INPUT} />
        </label>

        <div>
          <span className="block text-sm font-semibold text-pomme-ink/85 mb-2">Institutions</span>
          <div className="flex flex-wrap gap-2">
            {institutions.filter((i) => i.actif).map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => toggleInstitution(i.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  institutionIds.includes(i.id)
                    ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep'
                    : 'bg-white border-pomme-line/60 text-pomme-ink/85 hover:border-pomme-apple-deep'
                }`}
              >
                {i.nom}
              </button>
            ))}
          </div>
        </div>

        <button onClick={creer} className="bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf transition-colors">
          Créer le menu et générer les journées
        </button>
      </div>
    </div>
  );
}
