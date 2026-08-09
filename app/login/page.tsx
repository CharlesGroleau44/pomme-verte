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
      className="relative overflow-hidden min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #3B8C47, #123512)' }}
    >
      <div aria-hidden className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-float-slow" />
      <div aria-hidden className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-pomme-gold/20 blur-3xl animate-float-slow" style={{ animationDelay: '2s' }} />
      <form onSubmit={connecter} className="animate-scale-in relative bg-white rounded-3xl shadow-2xl p-9 w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.jpeg" alt="Traiteur La Pomme Verte" className="h-20 w-20 rounded-full object-cover shadow-lifted" />
          <div className="text-center">
            <h1 className="text-xl font-display font-semibold text-pomme-leaf-deep">Traiteur La Pomme Verte</h1>
            <p className="text-sm font-medium text-pomme-ink/70">Gestion des repas et des menus</p>
          </div>
        </div>

        <div className="space-y-3.5">
          <label className="block text-sm font-medium text-pomme-ink/85">
            Nom d&rsquo;usager
            <input
              value={usager}
              onChange={(e) => setUsager(e.target.value)}
              autoFocus
              className="w-full border border-pomme-line/50 rounded-xl px-3.5 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40 focus:border-pomme-apple-deep transition-shadow"
            />
          </label>
          <label className="block text-sm font-medium text-pomme-ink/85">
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
          className="press w-full bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf hover:shadow-lifted hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {enCours ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
