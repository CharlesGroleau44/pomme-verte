'use client';
// app/parent/connexion/page.tsx
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CHAMP } from '@/lib/ui';

const INPUT = CHAMP;

export default function ConnexionParentPage() {
  return (
    <Suspense fallback={null}>
      <FormulaireConnexion />
    </Suspense>
  );
}

function FormulaireConnexion() {
  const router = useRouter();
  const params = useSearchParams();
  const suite = params.get('suite') || '/parent/compte';

  const [courriel, setCourriel] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const connecter = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    setEnCours(true);
    const res = await fetch('/api/parent/connexion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courriel, motDePasse }),
    });
    setEnCours(false);
    if (!res.ok) {
      const { error } = await res.json();
      setErreur(error);
      return;
    }
    router.push(suite);
    router.refresh();
  };

  return (
    <div className="max-w-sm mx-auto">
      <form onSubmit={connecter} className="animate-scale-in bg-white rounded-2xl shadow-glow p-7 space-y-5">
        <div>
          <h1 className="text-2xl font-display font-semibold text-pomme-leaf-deep">Se connecter</h1>
          <p className="text-sm font-medium text-pomme-ink/65 mt-1">Pour commander un repas et gérer vos enfants.</p>
        </div>

        <div className="space-y-3.5">
          <label className="block text-sm font-medium text-pomme-ink/85">
            Courriel
            <input type="email" value={courriel} onChange={(e) => setCourriel(e.target.value)} autoFocus className={INPUT} />
          </label>
          <label className="block text-sm font-medium text-pomme-ink/85">
            Mot de passe
            <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} className={INPUT} />
          </label>
          <Link href="/parent/mot-de-passe-oublie" className="press inline-flex items-center min-h-[44px] ml-auto px-1 text-sm font-medium text-pomme-apple-deep hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>

        {erreur && <p className="text-sm text-status-critical font-medium">{erreur}</p>}

        <button
          type="submit"
          disabled={enCours}
          className="press w-full bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf hover:shadow-lifted hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {enCours ? 'Connexion…' : 'Se connecter'}
        </button>

        <p className="text-sm font-medium text-pomme-ink/65 text-center">
          Pas encore de compte ?{' '}
          <Link href={`/parent/inscription?suite=${encodeURIComponent(suite)}`} className="press inline-flex items-center min-h-[44px] -my-3 font-semibold text-pomme-apple-deep hover:underline">
            Créer un compte
          </Link>
        </p>
      </form>
    </div>
  );
}
