'use client';
// app/admin/menus/page.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';

type MenuInstitution = { institutionId: string; publie: boolean; institution: { id: string; nom: string } };
type Menu = {
  id: string;
  periodeDebut: string;
  periodeFin: string;
  thematique: string | null;
  institutions: MenuInstitution[];
};

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);

  const charger = async () => {
    const res = await fetch('/api/menus');
    setMenus(await res.json());
  };

  useEffect(() => { charger(); }, []);

  const togglePublication = async (menuId: string, institutionId: string, publieActuel: boolean) => {
    const res = await fetch(`/api/menus/${menuId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ institutionId, publie: !publieActuel }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      alert(error); // TODO Claude Code : notification UI + surligner les journées vides
      return;
    }
    charger();
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-CA');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Menus</h1>
        <Link href="/admin/menus/nouveau" className="bg-emerald-800 text-white rounded-lg px-4 py-2 text-sm font-medium">
          + Nouveau menu
        </Link>
      </div>

      <div className="space-y-3">
        {menus.map((m) => (
          <div key={m.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{fmt(m.periodeDebut)} au {fmt(m.periodeFin)}{m.thematique ? ` — ${m.thematique}` : ''}</div>
              </div>
              <Link href={`/admin/menus/${m.id}`} className="text-xs text-emerald-700 underline">Modifier les journées</Link>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {m.institutions.map((mi) => (
                <button
                  key={mi.institutionId}
                  onClick={() => togglePublication(m.id, mi.institutionId, mi.publie)}
                  className={`text-xs px-2 py-1 rounded-full ${mi.publie ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}
                >
                  {mi.institution.nom} — {mi.publie ? 'publié' : 'brouillon'}
                </button>
              ))}
            </div>
          </div>
        ))}
        {menus.length === 0 && <p className="text-sm text-gray-500">Aucun menu créé pour le moment.</p>}
      </div>
    </div>
  );
}
