'use client';
// app/login/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [usager, setUsager] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const connecter = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    setEnCours(true);
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usager, motDePasse }),
    });
    setEnCours(false);
    if (!res.ok) {
      const { error } = await res.json();
      setErreur(error);
      return;
    }
    router.push('/admin/menus');
    router.refresh();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #3B8C47, #123512)' }}
    >
      <form onSubmit={connecter} className="bg-white rounded-3xl shadow-2xl p-9 w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.jpeg" alt="Traiteur La Pomme Verte" className="h-20 w-20 rounded-full object-cover shadow-lifted" />
          <div className="text-center">
            <h1 className="text-lg font-extrabold text-pomme-leaf-deep">Traiteur La Pomme Verte</h1>
            <p className="text-sm text-pomme-ink/50">Gestion des repas et des menus</p>
          </div>
        </div>

        <div className="space-y-3.5">
          <label className="block text-sm font-medium text-pomme-ink/70">
            Nom d&rsquo;usager
            <input
              value={usager}
              onChange={(e) => setUsager(e.target.value)}
              autoFocus
              className="w-full border border-pomme-line/50 rounded-xl px-3.5 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40 focus:border-pomme-apple-deep transition-shadow"
            />
          </label>
          <label className="block text-sm font-medium text-pomme-ink/70">
            Mot de passe
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="w-full border border-pomme-line/50 rounded-xl px-3.5 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40 focus:border-pomme-apple-deep transition-shadow"
            />
          </label>
        </div>

        {erreur && <p className="text-sm text-status-critical font-medium">{erreur}</p>}

        <button
          type="submit"
          disabled={enCours}
          className="w-full bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf transition-colors disabled:opacity-60"
        >
          {enCours ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
