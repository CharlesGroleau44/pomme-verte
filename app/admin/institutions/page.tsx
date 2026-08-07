'use client';
// app/admin/institutions/page.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatTile from '../dashboard/StatTile';
import TendanceHebdo from '../dashboard/TendanceHebdo';
import EntreesRecentes from '../dashboard/EntreesRecentes';

type Institution = {
  id: string;
  nom: string;
  logoUrl: string | null;
  actif: boolean;
  ville: string | null;
  createdAt: string;
};

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [charge, setCharge] = useState(false);

  const charger = async () => {
    const res = await fetch('/api/institutions');
    setInstitutions(await res.json());
    setCharge(true);
  };

  useEffect(() => { charger(); }, []);

  const actives = institutions.filter((i) => i.actif).length;
  const recentes = [...institutions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((i) => ({
      id: i.id,
      titre: i.nom,
      sousTitre: i.ville ?? undefined,
      date: new Date(i.createdAt),
      href: `/admin/institutions/${i.id}`,
      vignette: i.logoUrl,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-pomme-leaf-deep">Institutions</h1>
        <Link
          href="/admin/institutions/nouveau"
          className="bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf transition-colors"
        >
          + Nouvelle institution
        </Link>
      </div>

      {charge && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatTile label="Total" valeur={institutions.length} />
            <StatTile label="Actives" valeur={actives} sousTexte={`${institutions.length - actives} inactive(s)`} />
            <StatTile label="Ce mois-ci" valeur={institutions.filter((i) => {
              const d = new Date(i.createdAt);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length} />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <TendanceHebdo titre="Institutions ajoutées" dates={institutions.map((i) => new Date(i.createdAt))} />
            </div>
            <EntreesRecentes titre="Récemment ajoutées" entrees={recentes} />
          </div>
        </>
      )}

      <div>
        <h2 className="text-sm font-semibold text-pomme-ink/50 uppercase tracking-wide mb-2">Toutes les institutions</h2>
        <div className="bg-white rounded-2xl shadow-card divide-y divide-pomme-soft overflow-hidden">
          {institutions.map((i) => (
            <Link
              key={i.id}
              href={`/admin/institutions/${i.id}`}
              className="flex items-center justify-between px-5 py-3.5 gap-3 hover:bg-pomme-soft/60 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                {i.logoUrl ? (
                  <img src={i.logoUrl} alt="" className="h-9 w-9 rounded-full object-cover shrink-0 border border-pomme-soft" />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-pomme-soft shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{i.nom}</div>
                  {i.ville && <div className="text-xs text-pomme-ink/40 truncate">{i.ville}</div>}
                </div>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                  i.actif ? 'bg-status-good/10 text-status-good' : 'bg-status-neutral/10 text-status-neutral'
                }`}
              >
                {i.actif ? 'Active' : 'Inactive'}
              </span>
            </Link>
          ))}
          {charge && institutions.length === 0 && <p className="p-5 text-sm text-pomme-ink/40">Aucune institution pour le moment.</p>}
        </div>
      </div>
    </div>
  );
}
