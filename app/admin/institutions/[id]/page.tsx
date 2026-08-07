'use client';
// app/admin/institutions/[id]/page.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChampsFiche, { FICHE_VIDE, type FormeFiche } from '../ChampsFiche';

type InstitutionComplete = FormeFiche & {
  id: string;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function FicheInstitutionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [institution, setInstitution] = useState<InstitutionComplete | null>(null);
  const [form, setForm] = useState<FormeFiche>(FICHE_VIDE);
  const [enCours, setEnCours] = useState(false);

  const charger = async () => {
    const res = await fetch(`/api/institutions/${params.id}`);
    const data: InstitutionComplete = await res.json();
    setInstitution(data);
    setForm({
      nom: data.nom,
      logoUrl: data.logoUrl,
      adresse: data.adresse ?? '',
      ville: data.ville ?? '',
      province: data.province ?? 'QC',
      codePostal: data.codePostal ?? '',
      telephone: data.telephone ?? '',
      courriel: data.courriel ?? '',
      siteWeb: data.siteWeb ?? '',
      personneContact: data.personneContact ?? '',
      telephoneContact: data.telephoneContact ?? '',
      courrielContact: data.courrielContact ?? '',
      notes: data.notes ?? '',
    });
  };

  useEffect(() => { charger(); }, [params.id]);

  const toggleActif = async () => {
    if (!institution) return;
    const res = await fetch(`/api/institutions/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: !institution.actif }),
    });
    setInstitution(await res.json());
  };

  const enregistrer = async () => {
    if (!form.nom.trim()) {
      alert('Le nom de l\'institution est requis.');
      return;
    }
    setEnCours(true);
    const res = await fetch(`/api/institutions/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setEnCours(false);
    if (!res.ok) {
      const { error } = await res.json();
      alert(error);
      return;
    }
    setInstitution(await res.json());
  };

  const supprimer = async () => {
    const res = await fetch(`/api/institutions/${params.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const { error } = await res.json();
      alert(error);
      return;
    }
    router.push('/admin/institutions');
  };

  const fmt = (d: string) => new Date(d).toLocaleString('fr-CA', { dateStyle: 'long', timeStyle: 'short' });

  if (!institution) return <p className="text-sm text-pomme-ink/65">Chargement…</p>;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-pomme-leaf-deep truncate">{institution.nom}</h1>
        <button onClick={supprimer} className="text-xs font-medium text-status-critical hover:underline shrink-0">Supprimer</button>
      </div>

      {/* Bandeau Actif/Inactif — bien en évidence, bascule instantanée */}
      <button
        onClick={toggleActif}
        className={`w-full flex items-center justify-between rounded-2xl px-5 py-4 border-2 transition-colors ${
          institution.actif
            ? 'bg-status-good/10 border-status-good'
            : 'bg-pomme-soft border-pomme-line'
        }`}
      >
        <span className={`text-base font-bold ${institution.actif ? 'text-status-good' : 'text-pomme-ink/70'}`}>
          {institution.actif ? '● Institution active' : '○ Institution inactive'}
        </span>
        <span
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
            institution.actif ? 'bg-status-good' : 'bg-pomme-line'
          }`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
              institution.actif ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </span>
      </button>

      <div className="text-xs font-medium text-pomme-ink/60 flex flex-wrap gap-x-4 gap-y-1">
        <span>Créée le {fmt(institution.createdAt)}</span>
        <span>Modifiée le {fmt(institution.updatedAt)}</span>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6">
        <ChampsFiche form={form} setForm={setForm} />
        <button
          onClick={enregistrer}
          disabled={enCours}
          className="mt-6 bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf transition-colors disabled:opacity-60"
        >
          {enCours ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
      </div>
    </div>
  );
}
