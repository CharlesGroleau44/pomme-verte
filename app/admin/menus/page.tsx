'use client';
// app/admin/menus/page.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StatTile from '../dashboard/StatTile';
import TendanceHebdo from '../dashboard/TendanceHebdo';
import EntreesRecentes from '../dashboard/EntreesRecentes';
import { estActivementPublie } from '@/lib/menu-logic';

type Menu = {
  id: string;
  institutionId: string;
  institution: { id: string; nom: string };
  periodeDebut: string;
  periodeFin: string;
  thematique: string | null;
  dateLimiteCommande: string;
  publie: boolean;
  createdAt: string;
};
type Institution = { id: string; nom: string; actif: boolean };

export default function MenusPage() {
  const router = useRouter();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [filtreInstitutionId, setFiltreInstitutionId] = useState<string | null>(null);
  const [dupliquerOuvertPour, setDupliquerOuvertPour] = useState<string | null>(null);
  const [institutionCible, setInstitutionCible] = useState('');
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

  const togglePublication = async (m: Menu) => {
    const res = await fetch(`/api/menus/${m.id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publie: !m.publie }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      alert(error); // TODO Claude Code : notification UI + surligner les journées vides
      return;
    }
    charger();
  };

  const dupliquer = async (menuId: string) => {
    if (!institutionCible) return;
    const res = await fetch(`/api/menus/${menuId}/dupliquer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ institutionId: institutionCible }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      alert(error);
      return;
    }
    const copie = await res.json();
    router.push(`/admin/menus/${copie.id}`);
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-CA', { timeZone: 'UTC' });

  const menusActifs = menus.map((m) => ({ ...m, actif: estActivementPublie({ publie: m.publie, dateLimiteCommande: new Date(m.dateLimiteCommande) }) }));
  const publies = menusActifs.filter((m) => m.actif).length;
  const recents = [...menus]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((m) => ({
      id: m.id,
      titre: m.thematique || 'Menu sans thématique',
      sousTitre: `${m.institution.nom} · ${fmt(m.periodeDebut)} au ${fmt(m.periodeFin)}`,
      date: new Date(m.createdAt),
      href: `/admin/menus/${m.id}`,
    }));

  const institutionsUtilisees = institutions.filter((i) => menus.some((m) => m.institutionId === i.id));
  const menusAffiches = filtreInstitutionId ? menusActifs.filter((m) => m.institutionId === filtreInstitutionId) : menusActifs;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up flex items-center justify-between">
        <h1 className="text-2xl font-display font-semibold text-pomme-leaf-deep">Menus</h1>
        <Link
          href="/admin/menus/nouveau"
          className="press bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf hover:shadow-lifted transition-all"
        >
          + Nouveau menu
        </Link>
      </div>

      {charge && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatTile label="Total" valeur={menus.length} />
            <StatTile label="Publiés" valeur={publies} sousTexte="visibles présentement" />
            <StatTile label="Non publiés" valeur={menus.length - publies} />
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
          <h2 className="text-sm font-semibold text-pomme-ink/85 uppercase tracking-wide">Tous les menus</h2>
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
          {menusAffiches.map((m) => {
            const expireBienQuePublie = m.publie && !m.actif;
            return (
              <div key={m.id} className="card-hover bg-white rounded-2xl shadow-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm text-pomme-ink">
                      {m.institution.nom} — {fmt(m.periodeDebut)} au {fmt(m.periodeFin)}{m.thematique ? ` · ${m.thematique}` : ''}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1">
                      <Link href={`/admin/menus/${m.id}`} className="text-xs font-medium text-pomme-apple-deep hover:underline">
                        Modifier les journées
                      </Link>
                      <button
                        onClick={() => { setDupliquerOuvertPour(dupliquerOuvertPour === m.id ? null : m.id); setInstitutionCible(''); }}
                        className="text-xs font-medium text-pomme-apple-deep hover:underline"
                      >
                        Dupliquer
                      </button>
                      {m.actif ? (
                        <a
                          href={`/menus/${m.institutionId}/${m.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-pomme-apple-deep hover:underline"
                        >
                          Voir en ligne ↗
                        </a>
                      ) : (
                        <span className="text-xs font-medium text-pomme-ink/40" title="Disponible une fois le menu publié">
                          Voir en ligne
                        </span>
                      )}
                      <a
                        href={`/api/menus/${m.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-pomme-apple-deep hover:underline"
                      >
                        PDF ↗
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => togglePublication(m)}
                    className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold shadow-soft transition-colors ${
                      m.actif ? 'bg-status-good text-white hover:opacity-90' : 'bg-status-critical text-white hover:opacity-90'
                    }`}
                  >
                    {m.actif ? 'PUBLIÉ' : 'NON PUBLIÉ'}
                  </button>
                </div>

                {expireBienQuePublie && (
                  <p className="text-xs font-semibold text-status-warning mt-2">
                    Date limite de commande dépassée — invisible pour les parents malgré le statut publié. Repoussez la date pour republier.
                  </p>
                )}

                {dupliquerOuvertPour === m.id && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 bg-pomme-soft/60 rounded-xl p-3">
                    <select
                      value={institutionCible}
                      onChange={(e) => setInstitutionCible(e.target.value)}
                      className="border border-pomme-line/50 rounded-lg px-3 py-1.5 text-sm"
                    >
                      <option value="" disabled>Vers quelle institution ?</option>
                      {institutions.filter((i) => i.actif).map((i) => <option key={i.id} value={i.id}>{i.nom}</option>)}
                    </select>
                    <button
                      onClick={() => dupliquer(m.id)}
                      disabled={!institutionCible}
                      className="bg-pomme-apple-deep text-white rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                    >
                      Confirmer
                    </button>
                    <button onClick={() => setDupliquerOuvertPour(null)} className="text-xs font-medium text-pomme-ink/65 hover:underline">Annuler</button>
                  </div>
                )}
              </div>
            );
          })}
          {charge && menus.length === 0 && <p className="text-sm text-pomme-ink/65">Aucun menu créé pour le moment.</p>}
          {charge && menus.length > 0 && menusAffiches.length === 0 && (
            <p className="text-sm text-pomme-ink/65">Aucun menu pour cette institution.</p>
          )}
        </div>
      </div>
    </div>
  );
}
