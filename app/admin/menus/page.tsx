'use client';
// app/admin/menus/page.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatTile from '../dashboard/StatTile';
import TendanceHebdo from '../dashboard/TendanceHebdo';
import EntreesRecentes from '../dashboard/EntreesRecentes';

type MenuInstitution = { institutionId: string; publie: boolean; institution: { id: string; nom: string } };
type Menu = {
  id: string;
  periodeDebut: string;
  periodeFin: string;
  thematique: string | null;
  institutions: MenuInstitution[];
  createdAt: string;
};
type Institution = { id: string; nom: string; actif: boolean };

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [filtreInstitutionId, setFiltreInstitutionId] = useState<string | null>(null);
  const [charge, setCharge] = useState(false);

  const charger = async () => {
    const [menusRes, institutionsRes] = await Promise.all([
      fetch('/api/menus'),
      fetch('/api/institutions'),
    ]);
    setMenus(await menusRes.json());
    setInstitutions(await institutionsRes.json());
    setCharge(true);
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

  const publies = menus.filter((m) => m.institutions.some((mi) => mi.publie)).length;
  const recents = [...menus]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((m) => ({
      id: m.id,
      titre: m.thematique || 'Menu sans thématique',
      sousTitre: `${fmt(m.periodeDebut)} au ${fmt(m.periodeFin)}`,
      date: new Date(m.createdAt),
      href: `/admin/menus/${m.id}`,
    }));

  const institutionsUtilisees = institutions.filter((i) =>
    menus.some((m) => m.institutions.some((mi) => mi.institutionId === i.id))
  );
  const menusAffiches = filtreInstitutionId
    ? menus.filter((m) => m.institutions.some((mi) => mi.institutionId === filtreInstitutionId))
    : menus;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-pomme-leaf-deep">Menus</h1>
        <Link
          href="/admin/menus/nouveau"
          className="bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf transition-colors"
        >
          + Nouveau menu
        </Link>
      </div>

      {charge && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatTile label="Total" valeur={menus.length} />
            <StatTile label="Publiés" valeur={publies} sousTexte="au moins une institution" />
            <StatTile label="Brouillons" valeur={menus.length - publies} />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <TendanceHebdo titre="Menus créés" dates={menus.map((m) => new Date(m.createdAt))} />
            </div>
            <EntreesRecentes titre="Récemment créés" entrees={recents} />
          </div>
        </>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-pomme-ink/70 uppercase tracking-wide">Tous les menus</h2>
        </div>

        {institutionsUtilisees.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => setFiltreInstitutionId(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filtreInstitutionId === null
                  ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep'
                  : 'bg-white border-pomme-line/60 text-pomme-ink/85 hover:border-pomme-apple-deep'
              }`}
            >
              Toutes les institutions
            </button>
            {institutionsUtilisees.map((i) => (
              <button
                key={i.id}
                onClick={() => setFiltreInstitutionId(i.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filtreInstitutionId === i.id
                    ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep'
                    : 'bg-white border-pomme-line/60 text-pomme-ink/85 hover:border-pomme-apple-deep'
                }`}
              >
                {i.nom}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {menusAffiches.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl shadow-card p-5">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm text-pomme-ink">
                  {fmt(m.periodeDebut)} au {fmt(m.periodeFin)}{m.thematique ? ` — ${m.thematique}` : ''}
                </div>
                <Link href={`/admin/menus/${m.id}`} className="text-xs font-medium text-pomme-apple-deep hover:underline shrink-0">
                  Modifier les journées
                </Link>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {m.institutions.map((mi) => (
                  <button
                    key={mi.institutionId}
                    onClick={() => togglePublication(m.id, mi.institutionId, mi.publie)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                      mi.publie ? 'bg-status-good/10 text-status-good' : 'bg-status-neutral/10 text-status-neutral'
                    }`}
                  >
                    {mi.institution.nom} — {mi.publie ? 'publié' : 'brouillon'}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {charge && menus.length === 0 && <p className="text-sm text-pomme-ink/65">Aucun menu créé pour le moment.</p>}
          {charge && menus.length > 0 && menusAffiches.length === 0 && (
            <p className="text-sm text-pomme-ink/65">Aucun menu pour cette institution.</p>
          )}
        </div>
      </div>
    </div>
  );
}
