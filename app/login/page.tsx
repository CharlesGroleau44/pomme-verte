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
    <div className="min-h-screen bg-emerald-800 flex items-center justify-center px-4">
      <form onSubmit={connecter} className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm space-y-5">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.jpeg" alt="Traiteur La Pomme Verte" className="h-20 w-20 rounded-full object-cover shadow" />
          <div className="text-center">
            <h1 className="text-lg font-semibold text-emerald-900">Traiteur La Pomme Verte</h1>
            <p className="text-sm text-gray-500">Gestion des repas et des menus</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm">
            Nom d&rsquo;usager
            <input
              value={usager}
              onChange={(e) => setUsager(e.target.value)}
              autoFocus
              className="w-full border rounded px-3 py-2 text-sm mt-1"
            />
          </label>
          <label className="block text-sm">
            Mot de passe
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm mt-1"
            />
          </label>
        </div>

        {erreur && <p className="text-sm text-red-600">{erreur}</p>}

        <button
          type="submit"
          disabled={enCours}
          className="w-full bg-emerald-800 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {enCours ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
