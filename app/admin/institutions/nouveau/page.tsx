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
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-extrabold text-pomme-leaf-deep">Nouvelle institution</h1>
      <div className="bg-white rounded-2xl shadow-card p-6">
        <ChampsFiche form={form} setForm={setForm} />
        <button
          onClick={creer}
          disabled={enCours}
          className="mt-6 bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf transition-colors disabled:opacity-60"
        >
          {enCours ? 'Création…' : 'Créer l\'institution'}
        </button>
      </div>
    </div>
  );
}
