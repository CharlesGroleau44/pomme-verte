'use client';
// app/admin/institutions/page.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Institution = {
  id: string;
  nom: string;
  logoUrl: string | null;
  actif: boolean;
  ville: string | null;
};

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  const charger = async () => {
    const res = await fetch('/api/institutions');
    setInstitutions(await res.json());
  };

  useEffect(() => { charger(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Institutions</h1>
        <Link href="/admin/institutions/nouveau" className="bg-emerald-800 text-white rounded-lg px-4 py-2 text-sm font-medium">
          + Nouvelle institution
        </Link>
      </div>

      <div className="divide-y border rounded-lg">
        {institutions.map((i) => (
          <Link
            key={i.id}
            href={`/admin/institutions/${i.id}`}
            className="flex items-center justify-between px-4 py-3 gap-3 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3 min-w-0">
              {i.logoUrl ? (
                <img src={i.logoUrl} alt="" className="h-9 w-9 rounded-full object-cover shrink-0 border" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-gray-100 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{i.nom}</div>
                {i.ville && <div className="text-xs text-gray-400 truncate">{i.ville}</div>}
              </div>
            </div>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
                i.actif ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {i.actif ? 'Active' : 'Inactive'}
            </span>
          </Link>
        ))}
        {institutions.length === 0 && <p className="p-4 text-sm text-gray-500">Aucune institution pour le moment.</p>}
      </div>
    </div>
  );
}
