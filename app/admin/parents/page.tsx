'use client';
// app/admin/parents/page.tsx
// Profils des comptes parents (connectés ET invités, indistinctement —
// voir POST /api/parent/commandes-invite). Sert surtout à activer la
// bascule "Prépayé à l'année" : un parent ayant réglé une entente
// annuelle directement avec le traiteur ne voit plus l'étape paiement
// au checkout, voir FormulaireCommande.tsx.
import { useEffect, useState } from 'react';
import StatTile from '../dashboard/StatTile';

type Parent = {
  id: string;
  nom: string;
  courriel: string;
  telephone: string | null;
  prepayeAnnuel: boolean;
  createdAt: string;
  _count: { enfants: number; commandes: number };
};

export default function ParentsPage() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [charge, setCharge] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [enCours, setEnCours] = useState<string | null>(null);

  const charger = () => {
    fetch('/api/admin/parents').then((r) => r.json()).then((d) => { setParents(d); setCharge(true); });
  };
  useEffect(charger, []);

  const basculerPrepaye = async (p: Parent) => {
    setEnCours(p.id);
    await fetch(`/api/admin/parents/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prepayeAnnuel: !p.prepayeAnnuel }),
    });
    setEnCours(null);
    charger();
  };

  const filtre = recherche.trim().toLowerCase();
  const parentsAffiches = parents.filter(
    (p) => !filtre || p.nom.toLowerCase().includes(filtre) || p.courriel.toLowerCase().includes(filtre)
  );
  const prepayes = parents.filter((p) => p.prepayeAnnuel).length;

  return (
    <div className="space-y-6">
      <h1 className="animate-fade-in-up text-2xl font-display font-semibold text-pomme-leaf-deep">Parents</h1>

      {charge && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatTile label="Profils" valeur={parents.length} />
          <StatTile label="Prépayés à l'année" valeur={prepayes} />
          <StatTile label="Commandes envoyées" valeur={parents.reduce((n, p) => n + p._count.commandes, 0)} />
        </div>
      )}

      <input
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher par nom ou courriel…"
        className="w-full border border-pomme-line/50 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40 focus:border-pomme-apple-deep transition-shadow"
      />

      <div className="bg-white rounded-2xl shadow-card divide-y divide-pomme-soft overflow-hidden">
        {parentsAffiches.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors duration-200 hover:bg-pomme-soft/50">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-pomme-ink truncate">{p.nom}</div>
              <div className="text-xs text-pomme-ink/65 truncate">
                {p.courriel}{p.telephone ? ` · ${p.telephone}` : ''} · {p._count.enfants} enfant{p._count.enfants > 1 ? 's' : ''} · {p._count.commandes} commande{p._count.commandes > 1 ? 's' : ''}
              </div>
            </div>
            <button
              onClick={() => basculerPrepaye(p)}
              disabled={enCours === p.id}
              className={`press shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all duration-200 disabled:opacity-60 ${
                p.prepayeAnnuel ? 'bg-status-good text-white shadow-soft' : 'bg-pomme-soft text-pomme-ink/70'
              }`}
            >
              {p.prepayeAnnuel ? 'PRÉPAYÉ À L’ANNÉE' : 'Paiement à la commande'}
            </button>
          </div>
        ))}
        {charge && parentsAffiches.length === 0 && (
          <p className="p-5 text-sm text-pomme-ink/65">Aucun profil parent pour le moment.</p>
        )}
      </div>
    </div>
  );
}
