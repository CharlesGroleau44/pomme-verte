'use client';
// app/admin/menus/[id]/CarteSelection.tsx
// Une carte de repas choisi pour une journée — affichage compact avec
// bouton Modifier (révèle nom/description/3 prix éditables, en
// partant des valeurs effectives) et bouton Supprimer (libère le
// repas pour cette journée).
import { useState } from 'react';
import { CHAMP_DENSE } from '@/lib/ui';
import { photo } from '@/lib/images';

export type Selection = {
  id: string;
  repasId: string;
  nomOverride: string | null;
  descriptionOverride: string | null;
  prixPetitOverride: string | null;
  prixRegulierOverride: string | null;
  prixDeuxiemeServiceOverride: string | null;
  repas: {
    id: string;
    nom: string;
    description: string | null;
    photoUrl: string | null;
    prixPetit: string;
    prixRegulier: string;
    prixDeuxiemeService: string;
  };
};

const INPUT = CHAMP_DENSE;

export default function CarteSelection({ selection, onChange }: { selection: Selection; onChange: () => void }) {
  const [enEdition, setEnEdition] = useState(false);
  const [enCours, setEnCours] = useState(false);

  const nomEffectif = selection.nomOverride ?? selection.repas.nom;
  const descEffective = selection.descriptionOverride ?? selection.repas.description ?? '';
  const prixPetitEffectif = selection.prixPetitOverride ?? selection.repas.prixPetit;
  const prixRegulierEffectif = selection.prixRegulierOverride ?? selection.repas.prixRegulier;
  const prixDeuxiemeEffectif = selection.prixDeuxiemeServiceOverride ?? selection.repas.prixDeuxiemeService;
  const estModifiee = Boolean(
    selection.nomOverride || selection.descriptionOverride ||
    selection.prixPetitOverride || selection.prixRegulierOverride || selection.prixDeuxiemeServiceOverride
  );

  const [form, setForm] = useState({
    nom: nomEffectif,
    description: descEffective,
    prixPetit: prixPetitEffectif,
    prixRegulier: prixRegulierEffectif,
    prixDeuxiemeService: prixDeuxiemeEffectif,
  });

  const ouvrirEdition = () => {
    setForm({
      nom: nomEffectif,
      description: descEffective,
      prixPetit: prixPetitEffectif,
      prixRegulier: prixRegulierEffectif,
      prixDeuxiemeService: prixDeuxiemeEffectif,
    });
    setEnEdition(true);
  };

  // Un champ redevient "override: null" s'il correspond au repas maître —
  // ainsi une future modification du repas maître se répercute encore ici.
  const enregistrer = async () => {
    setEnCours(true);
    const payload = {
      nomOverride: form.nom.trim() === selection.repas.nom ? null : form.nom,
      descriptionOverride: form.description.trim() === (selection.repas.description ?? '') ? null : form.description,
      prixPetitOverride: parseFloat(form.prixPetit) === parseFloat(selection.repas.prixPetit) ? null : parseFloat(form.prixPetit),
      prixRegulierOverride: parseFloat(form.prixRegulier) === parseFloat(selection.repas.prixRegulier) ? null : parseFloat(form.prixRegulier),
      prixDeuxiemeServiceOverride: parseFloat(form.prixDeuxiemeService) === parseFloat(selection.repas.prixDeuxiemeService) ? null : parseFloat(form.prixDeuxiemeService),
    };
    await fetch(`/api/selections/${selection.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setEnCours(false);
    setEnEdition(false);
    onChange();
  };

  const reinitialiser = () => {
    setForm({
      nom: selection.repas.nom,
      description: selection.repas.description ?? '',
      prixPetit: selection.repas.prixPetit,
      prixRegulier: selection.repas.prixRegulier,
      prixDeuxiemeService: selection.repas.prixDeuxiemeService,
    });
  };

  const supprimer = async () => {
    await fetch(`/api/selections/${selection.id}`, { method: 'DELETE' });
    onChange();
  };

  if (enEdition) {
    return (
      <div className="border-2 border-pomme-apple-mid/50 rounded-xl p-3 space-y-2 bg-pomme-soft/40">
        <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className={INPUT} placeholder="Nom" />
        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={INPUT} placeholder="Description" />
        <div className="grid grid-cols-3 gap-1.5">
          <label className="text-[10px] font-medium text-pomme-ink/70">
            Petit repas
            <input value={form.prixPetit} onChange={(e) => setForm({ ...form, prixPetit: e.target.value })} className={`${INPUT} mt-0.5`} />
          </label>
          <label className="text-[10px] font-medium text-pomme-ink/70">
            Régulier
            <input value={form.prixRegulier} onChange={(e) => setForm({ ...form, prixRegulier: e.target.value })} className={`${INPUT} mt-0.5`} />
          </label>
          <label className="text-[10px] font-medium text-pomme-ink/70">
            Portion +
            <input value={form.prixDeuxiemeService} onChange={(e) => setForm({ ...form, prixDeuxiemeService: e.target.value })} className={`${INPUT} mt-0.5`} />
          </label>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={enregistrer}
            disabled={enCours}
            className="bg-pomme-apple-deep text-white rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
          >
            {enCours ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button onClick={() => setEnEdition(false)} className="text-xs font-medium text-pomme-ink/70 hover:underline">Annuler</button>
          <button onClick={reinitialiser} className="text-xs font-medium text-status-warning hover:underline ml-auto">Valeurs du repas</button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-pomme-line/40 rounded-xl p-3 flex items-center gap-3">
      {selection.repas.photoUrl ? (
        <img {...photo(selection.repas.photoUrl, 160)} alt="" className="w-11 h-11 object-cover rounded-lg border border-pomme-soft shrink-0" />
      ) : (
        <div className="w-11 h-11 rounded-lg bg-pomme-soft shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate">{nomEffectif}</div>
        {descEffective && <div className="text-xs font-medium text-pomme-ink/70 truncate">{descEffective}</div>}
        <div className="text-xs font-medium text-pomme-ink/60">
          Petit {prixPetitEffectif}$ · Régulier {prixRegulierEffectif}$ · Portion + {prixDeuxiemeEffectif}$
        </div>
        {estModifiee && <span className="text-[10px] font-medium bg-status-warning/10 text-status-warning rounded-full px-2 py-0.5 inline-block mt-1">modifié pour cette journée</span>}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <button onClick={ouvrirEdition} className="text-xs font-medium text-pomme-apple-deep hover:underline">Modifier</button>
        <button onClick={supprimer} className="text-xs font-medium text-status-critical hover:underline">Supprimer</button>
      </div>
    </div>
  );
}
