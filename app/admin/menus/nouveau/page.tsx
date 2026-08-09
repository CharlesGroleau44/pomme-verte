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
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    fetch('/api/institutions').then((r) => r.json()).then(setInstitutions).catch(() => setInstitutions([]));
  }, []);

  const creer = async () => {
    if (!debut || !fin || !dateLimite || !institutionId) {
      alert('Date de début, date de fin, date limite de commande et une institution sont requis.');
      return;
    }
    setEnCours(true);
    const res = await fetch('/api/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        periodeDebut: debut,
        periodeFin: fin,
        thematique,
        dateLimiteCommande: dateLimite,
        institutionId,
      }),
    });
    setEnCours(false);
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
        <div>
          <span className="block text-sm font-semibold text-pomme-ink/85 mb-2">Institution</span>
          <p className="text-xs text-pomme-ink/60 mb-2">
            Un menu appartient à une seule institution — pour servir le même contenu ailleurs,
            dupliquez-le une fois créé.
          </p>
          <div className="flex flex-wrap gap-2">
            {institutions.filter((i) => i.actif).map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => setInstitutionId((cur) => (cur === i.id ? null : i.id))}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  institutionId === i.id
                    ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep'
                    : 'bg-white border-pomme-line/60 text-pomme-ink/85 hover:border-pomme-apple-deep'
                }`}
              >
                {i.nom}
              </button>
            ))}
          </div>
        </div>

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
          Date limite de commande *
          <input type="date" required value={dateLimite} onChange={(e) => setDateLimite(e.target.value)} className={INPUT} />
          <span className="block text-xs text-pomme-ink/60 mt-1 font-medium">Obligatoire — le menu se dépublie automatiquement à cette date, 23h59.</span>
        </label>

        <button
          onClick={creer}
          disabled={enCours}
          className="bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf transition-colors disabled:opacity-60"
        >
          {enCours ? 'Création…' : 'Créer le menu et générer les journées'}
        </button>
      </div>
    </div>
  );
}
