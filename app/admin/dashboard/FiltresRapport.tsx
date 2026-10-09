'use client';
// app/admin/dashboard/FiltresRapport.tsx
// Barre de filtres partagée par le tableau de bord et les 6 rapports —
// dates + école, seuls filtres qui s'appliquent à la fois à l'écran et aux
// PDF (voir lib/rapports.ts). Contrôlée : le parent garde l'état et décide
// quoi en faire (recharger le dashboard, construire les liens PDF).
import { useEffect, useState } from 'react';
import { CHAMP_NU } from '@/lib/ui';

export type Filtres = { dateDebut: string; dateFin: string; institutionId: string };

type Institution = { id: string; nom: string };

/** AAAA-MM-JJ du premier jour du mois courant / d'aujourd'hui — valeurs par défaut à l'ouverture. */
export function filtresParDefaut(): Filtres {
  const aujourdhui = new Date();
  const debutMois = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
  return {
    dateDebut: debutMois.toISOString().slice(0, 10),
    dateFin: aujourdhui.toISOString().slice(0, 10),
    institutionId: '',
  };
}

export default function FiltresRapport({ filtres, onChange }: { filtres: Filtres; onChange: (f: Filtres) => void }) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  useEffect(() => {
    fetch('/api/institutions').then((r) => r.json()).then(setInstitutions).catch(() => {});
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-card p-4 flex flex-wrap items-end gap-3">
      <label className="flex flex-col text-xs font-semibold text-pomme-ink/70">
        Du
        <input
          type="date"
          value={filtres.dateDebut}
          max={filtres.dateFin || undefined}
          onChange={(e) => onChange({ ...filtres, dateDebut: e.target.value })}
          className={CHAMP_NU + ' mt-1'}
        />
      </label>
      <label className="flex flex-col text-xs font-semibold text-pomme-ink/70">
        Au
        <input
          type="date"
          value={filtres.dateFin}
          min={filtres.dateDebut || undefined}
          onChange={(e) => onChange({ ...filtres, dateFin: e.target.value })}
          className={CHAMP_NU + ' mt-1'}
        />
      </label>
      <label className="flex flex-col text-xs font-semibold text-pomme-ink/70">
        École
        <select
          value={filtres.institutionId}
          onChange={(e) => onChange({ ...filtres, institutionId: e.target.value })}
          className={CHAMP_NU + ' mt-1'}
        >
          <option value="">Toutes les écoles</option>
          {institutions.map((i) => <option key={i.id} value={i.id}>{i.nom}</option>)}
        </select>
      </label>
      <button
        onClick={() => onChange(filtresParDefaut())}
        className="press ml-auto text-xs font-medium text-pomme-apple-deep hover:underline min-h-[44px] px-1"
      >
        Réinitialiser (mois courant)
      </button>
    </div>
  );
}
