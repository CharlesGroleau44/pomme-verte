'use client';
// app/parent/reinitialiser/page.tsx
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const INPUT = 'w-full border border-pomme-line/50 rounded-xl px-3.5 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40 focus:border-pomme-apple-deep transition-shadow';

export default function ReinitialiserPage() {
  return (
    <Suspense fallback={null}>
      <FormulaireReinitialiser />
    </Suspense>
  );
}

function FormulaireReinitialiser() {
  const router = useRouter();
  const params = useSearchParams();
  const jeton = params.get('jeton') || '';

  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  if (!jeton) {
    return (
      <div className="max-w-sm mx-auto">
        <div className="bg-white rounded-2xl shadow-glow p-7 text-center space-y-3">
          <p className="text-sm font-semibold text-status-critical">Lien invalide.</p>
          <Link href="/parent/mot-de-passe-oublie" className="text-sm font-medium text-pomme-apple-deep hover:underline">
            Refaire une demande
          </Link>
        </div>
      </div>
    );
  }

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    if (motDePasse !== confirmation) {
      setErreur('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setEnCours(true);
    const res = await fetch('/api/parent/reinitialiser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jeton, motDePasse }),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur((await res.json()).error);
      return;
    }
    router.push('/parent/compte');
    router.refresh();
  };

  return (
    <div className="max-w-sm mx-auto">
      <form onSubmit={soumettre} className="animate-scale-in bg-white rounded-2xl shadow-glow p-7 space-y-5">
        <div>
          <h1 className="text-2xl font-display font-semibold text-pomme-leaf-deep">Choisir un nouveau mot de passe</h1>
        </div>

        <div className="space-y-3.5">
          <label className="block text-sm font-medium text-pomme-ink/85">
            Nouveau mot de passe
            <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} autoFocus className={INPUT} />
            <span className="block text-xs text-pomme-ink/60 mt-1 font-medium">Au moins 8 caractères.</span>
          </label>
          <label className="block text-sm font-medium text-pomme-ink/85">
            Confirmer le mot de passe
            <input type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className={INPUT} />
          </label>
        </div>

        {erreur && <p className="text-sm text-status-critical font-medium">{erreur}</p>}

        <button
          type="submit"
          disabled={enCours}
          className="press w-full bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf hover:shadow-lifted hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {enCours ? 'Enregistrement…' : 'Changer mon mot de passe'}
        </button>
      </form>
    </div>
  );
}
