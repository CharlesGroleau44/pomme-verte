'use client';
// app/admin/registre/page.tsx
// Le registre officiel des élèves, par institution — importé du fichier
// Excel que chaque école envoie (voir lib/registre-eleves.ts), pour éviter
// la retranscription à la main sur la feuille de présence papier de
// Christine (courriel du 24 août 2026). Les couleurs reprennent celles de
// son mémo « Présences & ventes » : mauve = entente annuelle, orange =
// Fondation, rouge = allergie.
import { useEffect, useRef, useState } from 'react';
import { CHAMP_NU } from '@/lib/ui';

type Institution = { id: string; nom: string; actif: boolean };
type Eleve = {
  id: string;
  nom: string;
  prenom: string;
  niveau: string;
  ententeAnnuelle: boolean;
  fondation: boolean;
  allergie: string | null;
};

function classeLigne(e: Eleve): string {
  if (e.ententeAnnuelle) return 'bg-[#E6D6F0]';
  if (e.fondation) return 'bg-[#FBE0B8]';
  if (e.allergie) return 'bg-[#F7D6D3]';
  return '';
}

export default function RegistrePage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [charge, setCharge] = useState(false);
  const [enCoursImport, setEnCoursImport] = useState(false);
  const [messageImport, setMessageImport] = useState('');
  const inputFichier = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/institutions').then((r) => r.json()).then((d: Institution[]) => {
      const actives = d.filter((i) => i.actif);
      setInstitutions(actives);
      if (actives.length > 0) setInstitutionId(actives[0].id);
    });
  }, []);

  const chargerEleves = () => {
    if (!institutionId) return;
    setCharge(false);
    fetch(`/api/admin/institutions/${institutionId}/registre`).then((r) => r.json()).then((d) => {
      setEleves(d);
      setCharge(true);
    });
  };
  useEffect(chargerEleves, [institutionId]);

  const importer = async (fichier: File) => {
    if (!institutionId) return;
    setEnCoursImport(true);
    setMessageImport('');
    const formData = new FormData();
    formData.append('fichier', fichier);
    const res = await fetch(`/api/admin/institutions/${institutionId}/registre/import`, { method: 'POST', body: formData });
    setEnCoursImport(false);
    if (!res.ok) { setMessageImport((await res.json()).error); return; }
    const { nombre } = await res.json();
    setMessageImport(`✓ ${nombre} élèves importés.`);
    chargerEleves();
    if (inputFichier.current) inputFichier.current.value = '';
  };

  const annoter = async (eleveId: string, corps: Partial<Pick<Eleve, 'ententeAnnuelle' | 'fondation' | 'allergie' | 'niveau'>>) => {
    setEleves((cur) => cur.map((e) => (e.id === eleveId ? { ...e, ...corps } : e)));
    await fetch(`/api/admin/registre/${eleveId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corps),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-display font-semibold text-pomme-leaf-deep">Registre des élèves</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {institutions.map((i) => (
          <button
            key={i.id}
            onClick={() => setInstitutionId(i.id)}
            className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              institutionId === i.id ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep' : 'bg-white border-pomme-line/60 text-pomme-ink/85 hover:border-pomme-apple-deep'
            }`}
          >
            {i.nom}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-card p-5 flex flex-wrap items-center gap-3">
        <label className="press inline-flex items-center min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold bg-pomme-apple-deep text-white shadow-soft hover:bg-pomme-leaf transition-colors cursor-pointer">
          {enCoursImport ? 'Importation…' : 'Importer le fichier Excel de l\'école'}
          <input
            ref={inputFichier}
            type="file"
            accept=".xlsx"
            disabled={enCoursImport}
            onChange={(e) => e.target.files?.[0] && importer(e.target.files[0])}
            className="hidden"
          />
        </label>
        {institutionId && (
          <a
            href={`/api/admin/institutions/${institutionId}/registre/export`}
            className="press inline-flex items-center min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border border-pomme-line/60 text-pomme-ink/85 hover:border-pomme-apple-deep transition-colors"
          >
            Exporter en Excel
          </a>
        )}
        {messageImport && <p className="text-sm font-medium text-pomme-ink/75">{messageImport}</p>}
        <p className="w-full text-xs text-pomme-ink/55">
          L&rsquo;import remplace la liste par le nouveau fichier — les annotations déjà faites (entente, Fondation, allergie) sont conservées pour les élèves déjà présents.
        </p>
      </div>

      {charge && (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-pomme-soft/60 text-left text-xs font-semibold text-pomme-ink/70 uppercase tracking-wide">
                  <th className="px-4 py-2.5">Nom</th>
                  <th className="px-4 py-2.5">Prénom</th>
                  <th className="px-4 py-2.5">Niveau</th>
                  <th className="px-4 py-2.5">Entente</th>
                  <th className="px-4 py-2.5">Fondation</th>
                  <th className="px-4 py-2.5">Allergie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pomme-soft">
                {eleves.map((e) => (
                  <tr key={e.id} className={classeLigne(e)}>
                    <td className="px-4 py-2 font-semibold text-pomme-ink whitespace-nowrap">{e.nom}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{e.prenom}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <input
                        defaultValue={e.niveau}
                        onBlur={(ev) => { if (ev.target.value.trim() && ev.target.value !== e.niveau) annoter(e.id, { niveau: ev.target.value.trim() }); }}
                        className={CHAMP_NU + ' text-xs w-16'}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => annoter(e.id, { ententeAnnuelle: !e.ententeAnnuelle })}
                        className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                          e.ententeAnnuelle ? 'bg-[#B98FD1] text-white border-[#B98FD1]' : 'bg-white border-pomme-line/60 text-pomme-ink/60'
                        }`}
                      >
                        {e.ententeAnnuelle ? '✓' : '—'}
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => annoter(e.id, { fondation: !e.fondation })}
                        className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                          e.fondation ? 'bg-[#E8A23A] text-white border-[#E8A23A]' : 'bg-white border-pomme-line/60 text-pomme-ink/60'
                        }`}
                      >
                        {e.fondation ? '✓' : '—'}
                      </button>
                    </td>
                    <td className="px-4 py-2 min-w-[180px]">
                      <input
                        defaultValue={e.allergie ?? ''}
                        onBlur={(ev) => { if (ev.target.value !== (e.allergie ?? '')) annoter(e.id, { allergie: ev.target.value }); }}
                        placeholder="—"
                        className={CHAMP_NU + ' text-xs'}
                      />
                    </td>
                  </tr>
                ))}
                {eleves.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-pomme-ink/55">Aucun élève importé pour cette institution.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
