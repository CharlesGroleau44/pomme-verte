'use client';
// app/parent/inscription/page.tsx
// Crée le compte ET le premier enfant en une seule étape — voir
// api/parent/inscription/route.ts. L'institution se présélectionne
// automatiquement si on arrive depuis une page de menu précise (voir
// FormulaireCommande.tsx, qui passe institutionId dans l'URL).
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const INPUT = 'w-full border border-pomme-line/50 rounded-xl px-3.5 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40 focus:border-pomme-apple-deep transition-shadow';
const NIVEAUX = ['Préscolaire', '1', '2', '3', '4', '5', '6', 'Adulte'];
const INTOLERANCES = ['Gluten', 'Lactose', 'Végétarien'];

type Institution = { id: string; nom: string };

function Pilule({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`press px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
        actif ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep shadow-soft scale-105' : 'bg-white border-pomme-line/60 text-pomme-ink/85 hover:border-pomme-apple-mid hover:text-pomme-apple-deep'
      }`}
    >
      {children}
    </button>
  );
}

export default function InscriptionParentPage() {
  return (
    <Suspense fallback={null}>
      <FormulaireInscription />
    </Suspense>
  );
}

function FormulaireInscription() {
  const router = useRouter();
  const params = useSearchParams();
  const suite = params.get('suite') || '/parent/compte';
  const institutionIdInitiale = params.get('institutionId') || '';

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [courriel, setCourriel] = useState('');
  const [motDePasse, setMotDePasse] = useState('');

  const [enfantPrenom, setEnfantPrenom] = useState('');
  const [enfantNomDeFamille, setEnfantNomDeFamille] = useState('');
  const [enfantNiveau, setEnfantNiveau] = useState('');
  const [enfantInstitutionId, setEnfantInstitutionId] = useState(institutionIdInitiale);
  const [enfantIntolerances, setEnfantIntolerances] = useState<string[]>([]);
  const [enfantAutreIntolerance, setEnfantAutreIntolerance] = useState('');

  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    fetch('/api/parent/institutions')
      .then((r) => r.json())
      .then((data: Institution[]) => setInstitutions(data));
  }, []);

  const inscrire = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    setEnCours(true);
    const res = await fetch('/api/parent/inscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom, telephone, courriel, motDePasse,
        enfantPrenom, enfantNomDeFamille, enfantNiveau, enfantInstitutionId,
        enfantIntolerances, enfantAutreIntolerance,
      }),
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
      <form onSubmit={inscrire} className="animate-scale-in bg-white rounded-2xl shadow-glow p-7 space-y-6">
        <div>
          <h1 className="text-2xl font-display font-semibold text-pomme-leaf-deep">Créer un compte</h1>
          <p className="text-sm font-medium text-pomme-ink/65 mt-1">Pour commander les repas de votre enfant.</p>
        </div>

        <div className="space-y-3.5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-pomme-ink/50">Vos coordonnées</h2>
          <label className="block text-sm font-medium text-pomme-ink/85">
            Votre nom
            <input value={nom} onChange={(e) => setNom(e.target.value)} autoFocus className={INPUT} />
          </label>
          <label className="block text-sm font-medium text-pomme-ink/85">
            Téléphone
            <input value={telephone} onChange={(e) => setTelephone(e.target.value)} className={INPUT} />
          </label>
          <label className="block text-sm font-medium text-pomme-ink/85">
            Courriel
            <input type="email" value={courriel} onChange={(e) => setCourriel(e.target.value)} className={INPUT} />
          </label>
          <label className="block text-sm font-medium text-pomme-ink/85">
            Mot de passe
            <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} className={INPUT} />
            <span className="block text-xs text-pomme-ink/60 mt-1 font-medium">Au moins 8 caractères.</span>
          </label>
        </div>

        <div className="space-y-3.5 pt-1 border-t border-pomme-line/40">
          <h2 className="text-xs font-bold uppercase tracking-wide text-pomme-ink/50 pt-4">Votre enfant</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-pomme-ink/85">
              Prénom
              <input value={enfantPrenom} onChange={(e) => setEnfantPrenom(e.target.value)} className={INPUT} />
            </label>
            <label className="block text-sm font-medium text-pomme-ink/85">
              Nom de famille
              <input value={enfantNomDeFamille} onChange={(e) => setEnfantNomDeFamille(e.target.value)} className={INPUT} />
            </label>
          </div>
          <label className="block text-sm font-medium text-pomme-ink/85">
            École, CPE ou RPA
            <select value={enfantInstitutionId} onChange={(e) => setEnfantInstitutionId(e.target.value)} className={INPUT}>
              <option value="">Choisir…</option>
              {institutions.map((i) => <option key={i.id} value={i.id}>{i.nom}</option>)}
            </select>
          </label>
          <div>
            <span className="block text-sm font-medium text-pomme-ink/85 mb-2">Niveau</span>
            <div className="flex flex-wrap gap-2">
              {NIVEAUX.map((n) => (
                <Pilule key={n} actif={enfantNiveau === n} onClick={() => setEnfantNiveau(n)}>{n}</Pilule>
              ))}
            </div>
          </div>
          <div>
            <span className="block text-sm font-medium text-pomme-ink/85 mb-2">Intolérance / allergie</span>
            <div className="flex flex-wrap gap-2 mb-2">
              {INTOLERANCES.map((a) => (
                <Pilule
                  key={a} actif={enfantIntolerances.includes(a)}
                  onClick={() => setEnfantIntolerances((cur) => cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a])}
                >
                  {a}
                </Pilule>
              ))}
            </div>
            <input
              value={enfantAutreIntolerance}
              onChange={(e) => setEnfantAutreIntolerance(e.target.value)}
              placeholder="Autre (préciser)"
              className={INPUT}
            />
          </div>
        </div>

        {erreur && <p className="text-sm text-status-critical font-medium">{erreur}</p>}

        <button
          type="submit"
          disabled={enCours}
          className="press w-full bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf hover:shadow-lifted hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {enCours ? 'Création…' : 'Créer mon compte'}
        </button>

        <p className="text-sm font-medium text-pomme-ink/65 text-center">
          Déjà un compte ?{' '}
          <Link href={`/parent/connexion?suite=${encodeURIComponent(suite)}`} className="text-pomme-apple-deep hover:underline">
            Se connecter
          </Link>
        </p>
      </form>
    </div>
  );
}
