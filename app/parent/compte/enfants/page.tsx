'use client';
// app/parent/compte/enfants/page.tsx
import { useState } from 'react';
import { useParentCompte, type Enfant } from '../ContexteParent';
import { IconeModifier } from '../../Icones';
import { CHAMP } from '@/lib/ui';
import { photo } from '@/lib/images';

const NIVEAUX = ['Préscolaire', '1', '2', '3', '4', '5', '6', 'Adulte'];
const INTOLERANCES = ['Gluten', 'Lactose', 'Végétarien'];
const INPUT = CHAMP;

function Pilule({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`press min-h-[44px] px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
        actif ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep shadow-soft scale-105' : 'bg-white border-pomme-line/60 text-pomme-ink/85 hover:border-pomme-apple-mid hover:text-pomme-apple-deep'
      }`}
    >
      {children}
    </button>
  );
}

type Champs = { nomDeFamille: string; prenom: string; niveau: string; institutionId: string; intolerances: string[]; autreIntolerance: string };
const CHAMPS_VIDES: Champs = { nomDeFamille: '', prenom: '', niveau: '', institutionId: '', intolerances: [], autreIntolerance: '' };

function FormulaireEnfant({ initial, institutions, onAnnuler, onEnregistrer }: {
  initial: Champs;
  institutions: { id: string; nom: string }[];
  onAnnuler: () => void;
  onEnregistrer: (c: Champs) => Promise<string | void>;
}) {
  const [champs, setChamps] = useState(initial);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');

  const soumettre = async () => {
    setErreur('');
    if (!champs.nomDeFamille || !champs.prenom || !champs.niveau || !champs.institutionId) {
      setErreur('Prénom, nom, niveau et école sont requis.');
      return;
    }
    setEnCours(true);
    const err = await onEnregistrer(champs);
    setEnCours(false);
    if (err) setErreur(err);
  };

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-pomme-ink/85">
          Prénom
          <input value={champs.prenom} onChange={(e) => setChamps({ ...champs, prenom: e.target.value })} className={INPUT} />
        </label>
        <label className="block text-sm font-medium text-pomme-ink/85">
          Nom de famille
          <input value={champs.nomDeFamille} onChange={(e) => setChamps({ ...champs, nomDeFamille: e.target.value })} className={INPUT} />
        </label>
      </div>
      <label className="block text-sm font-medium text-pomme-ink/85">
        École
        <select value={champs.institutionId} onChange={(e) => setChamps({ ...champs, institutionId: e.target.value })} className={INPUT}>
          <option value="">Choisir…</option>
          {institutions.map((i) => <option key={i.id} value={i.id}>{i.nom}</option>)}
        </select>
      </label>
      <div>
        <span className="block text-sm font-medium text-pomme-ink/85 mb-2">Niveau</span>
        <div className="flex flex-wrap gap-2">
          {NIVEAUX.map((n) => (
            <Pilule key={n} actif={champs.niveau === n} onClick={() => setChamps({ ...champs, niveau: n })}>{n}</Pilule>
          ))}
        </div>
      </div>
      <div>
        <span className="block text-sm font-medium text-pomme-ink/85 mb-2">Intolérance / allergie</span>
        <div className="flex flex-wrap gap-2 mb-2">
          {INTOLERANCES.map((a) => (
            <Pilule
              key={a} actif={champs.intolerances.includes(a)}
              onClick={() => setChamps({ ...champs, intolerances: champs.intolerances.includes(a) ? champs.intolerances.filter((x) => x !== a) : [...champs.intolerances, a] })}
            >
              {a}
            </Pilule>
          ))}
        </div>
        <input
          value={champs.autreIntolerance}
          onChange={(e) => setChamps({ ...champs, autreIntolerance: e.target.value })}
          placeholder="Autre (préciser)"
          className={INPUT}
        />
      </div>

      {erreur && <p className="text-sm text-status-critical font-medium">{erreur}</p>}

      <div className="flex gap-2">
        <button onClick={soumettre} disabled={enCours} className="press bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf hover:shadow-lifted transition-all disabled:opacity-60">
          {enCours ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button onClick={onAnnuler} className="text-sm font-semibold text-pomme-ink/60 px-4 py-2.5">Annuler</button>
      </div>
    </div>
  );
}

function versChamps(e: Enfant): Champs {
  return {
    nomDeFamille: e.nomDeFamille, prenom: e.prenom, niveau: e.niveau,
    institutionId: e.institution.id, intolerances: e.intolerances, autreIntolerance: e.autreIntolerance ?? '',
  };
}

export default function EnfantsPage() {
  const { parent, institutions, recharger } = useParentCompte();
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [editionId, setEditionId] = useState<string | null>(null);

  const ajouter = async (c: Champs) => {
    const res = await fetch('/api/parent/enfants', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...c, autreIntolerance: c.autreIntolerance || null }),
    });
    if (!res.ok) return (await res.json()).error;
    setAjoutOuvert(false);
    recharger();
  };

  const modifier = async (id: string, c: Champs) => {
    const res = await fetch(`/api/parent/enfants/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...c, autreIntolerance: c.autreIntolerance || null }),
    });
    if (!res.ok) return (await res.json()).error;
    setEditionId(null);
    recharger();
  };

  const retirer = async (id: string) => {
    if (!confirm('Retirer cet enfant de votre compte ?')) return;
    await fetch(`/api/parent/enfants/${id}`, { method: 'DELETE' });
    recharger();
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="animate-fade-in-up flex items-center justify-between">
        <h2 className="text-xl font-display font-semibold text-pomme-leaf-deep">Mes enfants</h2>
        {!ajoutOuvert && (
          <button onClick={() => setAjoutOuvert(true)} className="press inline-flex items-center min-h-[44px] -ml-1 px-1 text-sm font-semibold text-pomme-apple-deep hover:underline">
            + Ajouter un enfant
          </button>
        )}
      </div>

      {ajoutOuvert && (
        <div className="animate-scale-in bg-white rounded-2xl shadow-glow p-5">
          <FormulaireEnfant initial={CHAMPS_VIDES} institutions={institutions} onAnnuler={() => setAjoutOuvert(false)} onEnregistrer={ajouter} />
        </div>
      )}

      <div className="space-y-3">
        {parent.enfants.map((e, idx) => (
          <div key={e.id} className={`animate-fade-in-up stagger-${Math.min(idx + 1, 6)} bg-white rounded-2xl shadow-card p-5 ${editionId !== e.id ? 'card-hover' : ''}`}>
            {editionId === e.id ? (
              <FormulaireEnfant
                initial={versChamps(e)} institutions={institutions}
                onAnnuler={() => setEditionId(null)}
                onEnregistrer={(c) => modifier(e.id, c)}
              />
            ) : (
              <div className="flex items-center gap-3.5">
                {e.institution.logoUrl ? (
                  <img {...photo(e.institution.logoUrl, 160)} alt="" className="h-11 w-11 rounded-xl object-contain bg-pomme-soft p-1 shrink-0" />
                ) : (
                  <div className="h-11 w-11 rounded-xl bg-pomme-soft shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-pomme-ink">{e.prenom} {e.nomDeFamille}</div>
                  <div className="text-xs font-medium text-pomme-ink/65 mt-0.5">{e.institution.nom} · Niveau {e.niveau}</div>
                  {(e.intolerances.length > 0 || e.autreIntolerance) && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[...e.intolerances, e.autreIntolerance].filter(Boolean).map((a) => (
                        <span key={a} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-status-warning/10 text-status-warning">
                          ⚠ {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button onClick={() => setEditionId(e.id)} className="press inline-flex items-center gap-1.5 min-h-[44px] -ml-1 px-1 text-sm font-semibold text-pomme-apple-deep hover:underline">
                    <IconeModifier /> Modifier
                  </button>
                  <button onClick={() => retirer(e.id)} className="text-xs font-medium text-status-critical hover:underline">
                    Retirer
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {parent.enfants.length === 0 && !ajoutOuvert && (
          <p className="text-sm text-pomme-ink/65 bg-white rounded-2xl shadow-card p-5">Aucun enfant enregistré pour le moment.</p>
        )}
      </div>
    </div>
  );
}
