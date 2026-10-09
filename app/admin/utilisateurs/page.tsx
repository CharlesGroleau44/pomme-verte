'use client';
// app/admin/utilisateurs/page.tsx
// Gestion des comptes admin — réservé au rôle ADMIN (voir middleware.ts et
// prisma/schema.prisma, RoleAdmin). Un GESTIONNAIRE ne peut jamais atteindre
// cette page : le lien n'apparaît même pas dans Sidebar.tsx pour lui, et le
// middleware bloquerait quand même une visite directe à l'URL.
import { useEffect, useState } from 'react';

type Compte = {
  id: string;
  nom: string;
  courriel: string;
  role: 'ADMIN' | 'GESTIONNAIRE';
  actif: boolean;
  createdAt: string;
};

const ETIQUETTE_ROLE: Record<Compte['role'], string> = {
  ADMIN: 'Administrateur',
  GESTIONNAIRE: 'Gestionnaire',
};

function CarteMotDePasse({ nom, motDePasse, onFermer }: { nom: string; motDePasse: string; onFermer: () => void }) {
  return (
    <div className="bg-pomme-soft border-2 border-pomme-apple-deep rounded-2xl p-5 space-y-3">
      <p className="text-sm font-bold text-pomme-leaf-deep">Mot de passe de {nom} — à copier maintenant</p>
      <p className="text-xs text-pomme-ink/70">
        Il ne sera plus jamais affiché. Transmettez-le à la personne par un moyen sûr, puis fermez cette carte.
      </p>
      <div className="bg-white rounded-xl px-4 py-3 font-mono text-sm text-pomme-leaf-deep break-all select-all">
        {motDePasse}
      </div>
      <button
        onClick={onFermer}
        className="press bg-pomme-apple-deep text-white rounded-lg px-4 py-2 text-xs font-semibold hover:bg-pomme-leaf transition-colors"
      >
        J'ai copié le mot de passe
      </button>
    </div>
  );
}

export default function UtilisateursPage() {
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [moi, setMoi] = useState<Compte | null>(null);
  const [charge, setCharge] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState('');
  const [courriel, setCourriel] = useState('');
  const [role, setRole] = useState<Compte['role']>('GESTIONNAIRE');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState<string | null>(null);
  const [motDePasseAffiche, setMotDePasseAffiche] = useState<{ nom: string; motDePasse: string } | null>(null);

  const charger = () => {
    fetch('/api/admin/utilisateurs').then((r) => r.json()).then((d) => { setComptes(d); setCharge(true); });
    fetch('/api/admin/moi').then((r) => r.json()).then(setMoi);
  };
  useEffect(charger, []);

  const creer = async () => {
    setErreur('');
    const res = await fetch('/api/admin/utilisateurs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, courriel, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErreur(data.error ?? 'Erreur inattendue.');
      return;
    }
    setMotDePasseAffiche({ nom: data.compte.nom, motDePasse: data.motDePasse });
    setNom('');
    setCourriel('');
    setRole('GESTIONNAIRE');
    setShowForm(false);
    charger();
  };

  const basculerActif = async (c: Compte) => {
    setEnCours(c.id);
    await fetch(`/api/admin/utilisateurs/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: !c.actif }),
    });
    setEnCours(null);
    charger();
  };

  const changerRole = async (c: Compte, nouveauRole: Compte['role']) => {
    setEnCours(c.id);
    await fetch(`/api/admin/utilisateurs/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: nouveauRole }),
    });
    setEnCours(null);
    charger();
  };

  const reinitialiserMotDePasse = async (c: Compte) => {
    setEnCours(c.id);
    const res = await fetch(`/api/admin/utilisateurs/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reinitialiserMotDePasse: true }),
    });
    const data = await res.json();
    setEnCours(null);
    if (res.ok && data.motDePasse) {
      setMotDePasseAffiche({ nom: c.nom, motDePasse: data.motDePasse });
    }
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up flex items-center justify-between">
        <h1 className="text-2xl font-display font-semibold text-pomme-leaf-deep">Utilisateurs</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="press bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf hover:shadow-lifted transition-all"
        >
          {showForm ? 'Annuler' : '+ Nouveau compte'}
        </button>
      </div>

      <p className="text-sm text-pomme-ink/65 max-w-2xl">
        Les comptes <strong>Administrateur</strong> ont accès à tout, y compris cette page. Les comptes{' '}
        <strong>Gestionnaire</strong> ont accès à tout le reste de la console (institutions, repas, menus, commandes,
        parents) mais jamais à la gestion des comptes.
      </p>

      {motDePasseAffiche && (
        <CarteMotDePasse
          nom={motDePasseAffiche.nom}
          motDePasse={motDePasseAffiche.motDePasse}
          onFermer={() => setMotDePasseAffiche(null)}
        />
      )}

      {showForm && (
        <div className="bg-white rounded-2xl shadow-card p-6 space-y-4">
          <input
            placeholder="Nom complet"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="w-full border border-pomme-line/50 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40 focus:border-pomme-apple-deep"
          />
          <input
            placeholder="Courriel"
            type="email"
            value={courriel}
            onChange={(e) => setCourriel(e.target.value)}
            className="w-full border border-pomme-line/50 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40 focus:border-pomme-apple-deep"
          />
          <div>
            <span className="block text-sm font-semibold text-pomme-ink/85 mb-2">Niveau d'accès</span>
            <div className="flex gap-2">
              {(['GESTIONNAIRE', 'ADMIN'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    role === r
                      ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep'
                      : 'bg-white border-pomme-line/60 text-pomme-ink/85 hover:border-pomme-apple-deep'
                  }`}
                >
                  {ETIQUETTE_ROLE[r]}
                </button>
              ))}
            </div>
          </div>
          {erreur && <p className="text-xs font-semibold text-status-critical">{erreur}</p>}
          <button
            onClick={creer}
            disabled={!nom || !courriel}
            className="bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf transition-colors disabled:opacity-50"
          >
            Créer le compte
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-card divide-y divide-pomme-soft overflow-hidden">
        {comptes.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors duration-200 hover:bg-pomme-soft/50">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-pomme-ink truncate flex items-center gap-2">
                {c.nom}
                {c.id === moi?.id && <span className="text-[10px] font-bold text-pomme-apple-deep">(vous)</span>}
                {!c.actif && <span className="text-[10px] font-bold text-status-critical bg-status-critical/10 px-2 py-0.5 rounded-full">Désactivé</span>}
              </div>
              <div className="text-xs text-pomme-ink/65 truncate">{c.courriel}</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={c.role}
                onChange={(e) => changerRole(c, e.target.value as Compte['role'])}
                disabled={enCours === c.id || c.id === moi?.id}
                className="border border-pomme-line/50 rounded-lg px-2.5 py-1.5 text-xs font-medium disabled:opacity-60"
              >
                <option value="GESTIONNAIRE">Gestionnaire</option>
                <option value="ADMIN">Administrateur</option>
              </select>
              <button
                onClick={() => reinitialiserMotDePasse(c)}
                disabled={enCours === c.id}
                className="press text-xs font-medium text-pomme-apple-deep hover:underline disabled:opacity-60"
              >
                Réinitialiser le mot de passe
              </button>
              <button
                onClick={() => basculerActif(c)}
                disabled={enCours === c.id || c.id === moi?.id}
                className={`press shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all duration-200 disabled:opacity-60 ${
                  c.actif ? 'bg-status-good text-white shadow-soft' : 'bg-pomme-soft text-pomme-ink/70'
                }`}
              >
                {c.actif ? 'ACTIF' : 'INACTIF'}
              </button>
            </div>
          </div>
        ))}
        {charge && comptes.length === 0 && (
          <p className="p-5 text-sm text-pomme-ink/65">Aucun compte pour le moment.</p>
        )}
      </div>
    </div>
  );
}
