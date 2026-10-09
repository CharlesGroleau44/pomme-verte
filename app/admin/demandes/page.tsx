'use client';
// app/admin/demandes/page.tsx
// Boîte de réception des demandes de prépaiement — créées soit à
// l'inscription (voir POST /api/parent/inscription), soit en un clic par
// un parent déjà connecté (voir POST /api/parent/moi/demande-prepaye).
// Chaque demande arrive déjà rattachée à un compte, avec son école et la
// formule souhaitée.
//
// Rien ne s'active depuis cet écran — c'est volontaire. Christine
// communique avec le parent, reçoit le paiement hors ligne, puis active
// l'entente ou le solde depuis /admin/parents comme avant. Cette page ne
// sert qu'à ne perdre aucune demande.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatTile from '../dashboard/StatTile';

type Demande = {
  id: string;
  formule: 'ENTENTE' | 'SOLDE';
  nomParent: string;
  courriel: string;
  telephone: string | null;
  nomEnfant: string | null;
  message: string | null;
  traitee: boolean;
  createdAt: string;
  institution: { nom: string };
};

const LABEL_FORMULE: Record<string, string> = {
  ENTENTE: 'Entente annuelle',
  SOLDE: 'Solde prépayé',
};

export default function DemandesPage() {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [charge, setCharge] = useState(false);
  const [enCours, setEnCours] = useState<string | null>(null);

  const charger = () => {
    fetch('/api/admin/demandes').then((r) => r.json()).then((d) => { setDemandes(d); setCharge(true); });
  };
  useEffect(charger, []);

  const basculer = async (d: Demande) => {
    setEnCours(d.id);
    await fetch(`/api/admin/demandes/${d.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ traitee: !d.traitee }),
    });
    setEnCours(null);
    charger();
  };

  const supprimer = async (d: Demande) => {
    setEnCours(d.id);
    await fetch(`/api/admin/demandes/${d.id}`, { method: 'DELETE' });
    setEnCours(null);
    charger();
  };

  const enAttente = demandes.filter((d) => !d.traitee);
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6">
      <h1 className="animate-fade-in-up text-2xl font-display font-semibold text-pomme-leaf-deep">Demandes de prépaiement</h1>

      {charge && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatTile label="En attente" valeur={enAttente.length} />
          <StatTile label="Ententes annuelles" valeur={enAttente.filter((d) => d.formule === 'ENTENTE').length} />
          <StatTile label="Soldes prépayés" valeur={enAttente.filter((d) => d.formule === 'SOLDE').length} />
        </div>
      )}

      <p className="text-xs font-medium text-pomme-ink/60 bg-pomme-soft/50 rounded-xl px-4 py-2.5">
        💡 Ces demandes n&rsquo;activent rien automatiquement. Communiquez avec le parent, recevez le paiement,
        puis activez sa formule depuis <Link href="/admin/parents" className="text-pomme-apple-deep font-semibold hover:underline">Parents</Link>.
      </p>

      <div className="space-y-3">
        {demandes.map((d) => (
          <div
            key={d.id}
            className={`bg-white rounded-2xl shadow-card p-5 transition-opacity duration-200 ${d.traitee ? 'opacity-55' : ''}`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    d.formule === 'ENTENTE' ? 'bg-status-good/10 text-status-good' : 'bg-pomme-apple-deep/10 text-pomme-apple-deep'
                  }`}>
                    {LABEL_FORMULE[d.formule]}
                  </span>
                  <span className="text-sm font-bold text-pomme-ink">{d.nomParent}</span>
                  <span className="text-xs font-medium text-pomme-ink/60">· {d.institution.nom}</span>
                </div>
                <div className="text-xs font-medium text-pomme-ink/70 mt-1.5 space-y-0.5">
                  <div>
                    <a href={`mailto:${d.courriel}`} className="text-pomme-apple-deep hover:underline">{d.courriel}</a>
                    {d.telephone && <span> · {d.telephone}</span>}
                  </div>
                  {d.nomEnfant && <div>Enfant : {d.nomEnfant}</div>}
                  <div className="text-pomme-ink/50">Reçue le {fmt(d.createdAt)}</div>
                </div>
                {d.message && (
                  <p className="text-xs font-medium text-pomme-ink/80 bg-pomme-soft/60 rounded-lg px-3 py-2 mt-2 whitespace-pre-line">
                    {d.message}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => basculer(d)}
                  disabled={enCours === d.id}
                  className={`press rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 disabled:opacity-60 ${
                    d.traitee ? 'bg-pomme-soft text-pomme-ink/70' : 'bg-status-good text-white shadow-soft'
                  }`}
                >
                  {d.traitee ? 'Rouvrir' : '✓ Marquer traitée'}
                </button>
                <button
                  onClick={() => supprimer(d)}
                  disabled={enCours === d.id}
                  className="text-xs font-medium text-pomme-ink/50 hover:text-status-critical disabled:opacity-60"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        ))}
        {charge && demandes.length === 0 && (
          <p className="text-sm text-pomme-ink/65 bg-white rounded-2xl shadow-card p-5">
            Aucune demande pour le moment — elles apparaîtront ici dès qu&rsquo;un parent en fera une depuis la page de son école.
          </p>
        )}
      </div>
    </div>
  );
}
