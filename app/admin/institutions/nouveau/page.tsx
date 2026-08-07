'use client';
// app/admin/institutions/nouveau/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ChampsFiche, { FICHE_VIDE, type FormeFiche } from '../ChampsFiche';

export default function NouvelleInstitutionPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormeFiche>(FICHE_VIDE);
  const [enCours, setEnCours] = useState(false);

  const creer = async () => {
    if (!form.nom.trim()) {
      alert('Le nom de l\'institution est requis.');
      return;
    }
    setEnCours(true);
    const res = await fetch('/api/institutions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setEnCours(false);
    if (!res.ok) {
      const { error } = await res.json();
      alert(error);
      return;
    }
    router.push('/admin/institutions');
  };

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-lg font-semibold">Nouvelle institution</h1>
      <ChampsFiche form={form} setForm={setForm} />
      <button
        onClick={creer}
        disabled={enCours}
        className="bg-emerald-800 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {enCours ? 'Création…' : 'Créer l\'institution'}
      </button>
    </div>
  );
}
