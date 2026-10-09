'use client';
// app/parent/mot-de-passe-oublie/page.tsx
import { useState } from 'react';
import Link from 'next/link';
import { CHAMP } from '@/lib/ui';

const INPUT = CHAMP;

export default function MotDePasseOubliePage() {
  const [courriel, setCourriel] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnCours(true);
    await fetch('/api/parent/mot-de-passe-oublie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courriel }),
    });
    setEnCours(false);
    setEnvoye(true);
  };

  return (
    <div className="max-w-sm mx-auto">
      <div className="animate-scale-in bg-white rounded-2xl shadow-glow p-7 space-y-5">
        <div>
          <h1 className="text-2xl font-display font-semibold text-pomme-leaf-deep">Mot de passe oublié</h1>
          <p className="text-sm font-medium text-pomme-ink/65 mt-1">Entrez votre courriel — on vous envoie un lien pour en choisir un nouveau.</p>
        </div>

        {envoye ? (
          <p className="animate-scale-in text-sm text-status-good font-bold bg-status-good/10 rounded-xl px-4 py-3 text-center">
            ✓ Si un compte existe avec ce courriel, un lien de réinitialisation vient de lui être envoyé.
          </p>
        ) : (
          <form onSubmit={soumettre} className="space-y-5">
            <label className="block text-sm font-medium text-pomme-ink/85">
              Courriel
              <input type="email" value={courriel} onChange={(e) => setCourriel(e.target.value)} autoFocus required className={INPUT} />
            </label>
            <button
              type="submit"
              disabled={enCours}
              className="press w-full bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf hover:shadow-lifted hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {enCours ? 'Envoi…' : 'Envoyer le lien'}
            </button>
          </form>
        )}

        <p className="text-sm font-medium text-pomme-ink/65 text-center">
          <Link href="/parent/connexion" className="text-pomme-apple-deep hover:underline">← Retour à la connexion</Link>
        </p>
      </div>
    </div>
  );
}
