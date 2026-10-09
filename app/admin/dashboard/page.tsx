'use client';
// app/admin/dashboard/page.tsx
// Tableau de bord de gestion — KPI, tendance, ventilations, et point
// d'accès aux 6 rapports PDF brandés (voir lib/pdf/rapports/). Les mêmes
// filtres (dates + école, voir FiltresRapport.tsx) pilotent l'écran ET les
// liens PDF, pour que ce qu'on imprime corresponde toujours à ce qu'on
// regarde.
import { useEffect, useState } from 'react';
import StatTile from './StatTile';
import TendanceHebdo from './TendanceHebdo';
import FiltresRapport, { type Filtres, filtresParDefaut } from './FiltresRapport';

type DonneesDashboard = {
  totaux: { revenu: number; repas: number; commandes: number; nonPaye: number };
  parModePaiement: { modePaiement: string; repas: number; revenu: number }[];
  parEcole: { institutionId: string; institutionNom: string; commandes: number; repas: number; revenu: number; nonPaye: number }[];
  dates: string[];
};

const LABEL_PAIEMENT: Record<string, string> = {
  ARGENT: 'Argent comptant',
  VIREMENT_INTERAC: 'Virement Interac',
  CHEQUE: 'Chèque',
  PAYPAL: 'Paypal',
  PREPAYE: 'Entente annuelle',
  SOLDE_PREPAYE: 'Solde prépayé',
  FONDATION: 'Fondation',
};

// `filtres` liste EXACTEMENT ce que chaque route lit (voir les 6 fichiers
// sous app/api/admin/rapports/) — sert à la fois à construire un lien propre
// (construireLien n'envoie que ce qui compte, jamais un paramètre ignoré en
// silence) et à afficher clairement à Christine ce qui s'applique à chaque
// rapport, pour qu'elle ne pense pas qu'un filtre de date agit sur un
// rapport qui l'ignore (ex. Ententes annuelles, état vivant, pas de période).
const RAPPORTS = [
  { chemin: 'sommaire-financier', titre: 'Sommaire financier', description: 'Revenu, ventilation par mode de paiement, comparaison à la période précédente', filtres: ['dates', 'ecole'] as const },
  { chemin: 'par-ecole', titre: 'Rapport par école', description: 'Comparaison des commandes et revenus entre écoles', filtres: ['dates'] as const },
  { chemin: 'ententes-annuelles', titre: 'Ententes annuelles', description: 'État du jour — versements, repas consommés et restants par élève', filtres: ['ecole'] as const },
  { chemin: 'soldes-prepayes', titre: 'Soldes prépayés (libres)', description: 'État du jour — dépôts, consommation et solde disponible par famille', filtres: ['ecole'] as const },
  { chemin: 'frequentation', titre: 'Fréquentation', description: 'Taux de participation des comptes parents actifs, par école et par niveau', filtres: ['dates', 'ecole'] as const },
  { chemin: 'bilan-periode', titre: 'Bilan de période', description: 'Vue consolidée mois par mois — utile pour un bilan de fin d\'année', filtres: ['dates', 'ecole'] as const },
] as const;

const LABEL_FILTRE: Record<'dates' | 'ecole', string> = { dates: 'dates', ecole: 'école' };

function construireLien(chemin: string, filtresApplicables: readonly ('dates' | 'ecole')[], filtres: Filtres) {
  const params = new URLSearchParams();
  if (filtresApplicables.includes('dates')) {
    if (filtres.dateDebut) params.set('dateDebut', filtres.dateDebut);
    if (filtres.dateFin) params.set('dateFin', filtres.dateFin);
  }
  if (filtresApplicables.includes('ecole') && filtres.institutionId) params.set('institutionId', filtres.institutionId);
  return `/api/admin/rapports/${chemin}?${params.toString()}`;
}

export default function DashboardPage() {
  const [filtres, setFiltres] = useState<Filtres>(filtresParDefaut());
  const [donnees, setDonnees] = useState<DonneesDashboard | null>(null);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    setCharge(false);
    const params = new URLSearchParams();
    if (filtres.dateDebut) params.set('dateDebut', filtres.dateDebut);
    if (filtres.dateFin) params.set('dateFin', filtres.dateFin);
    if (filtres.institutionId) params.set('institutionId', filtres.institutionId);
    fetch(`/api/admin/dashboard?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { setDonnees(d); setCharge(true); });
  }, [filtres]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-semibold text-pomme-leaf-deep">Tableau de bord</h1>

      <FiltresRapport filtres={filtres} onChange={setFiltres} />

      {charge && donnees && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile label="Revenu de la période" valeur={`${donnees.totaux.revenu.toFixed(2)}$`} />
            <StatTile label="Commandes" valeur={donnees.totaux.commandes} />
            <StatTile label="Repas servis" valeur={donnees.totaux.repas} />
            <StatTile label="À percevoir" valeur={`${donnees.totaux.nonPaye.toFixed(2)}$`} />
          </div>

          <TendanceHebdo titre="Commandes par semaine" dates={donnees.dates.map((d) => new Date(d))} />

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-card p-5">
              <h3 className="text-sm font-semibold text-pomme-ink/85 mb-3">Par mode de paiement</h3>
              {donnees.parModePaiement.length === 0 ? (
                <p className="text-sm text-pomme-ink/65 py-4 text-center">Aucune donnée.</p>
              ) : (
                <ul className="divide-y divide-pomme-soft">
                  {donnees.parModePaiement.map((v) => (
                    <li key={v.modePaiement} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-pomme-ink">{LABEL_PAIEMENT[v.modePaiement] ?? v.modePaiement}</span>
                      <span className="font-semibold text-pomme-leaf-deep">{v.revenu.toFixed(2)}$</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-card p-5">
              <h3 className="text-sm font-semibold text-pomme-ink/85 mb-3">Par école</h3>
              {donnees.parEcole.length === 0 ? (
                <p className="text-sm text-pomme-ink/65 py-4 text-center">Aucune donnée.</p>
              ) : (
                <ul className="divide-y divide-pomme-soft">
                  {donnees.parEcole.map((e) => (
                    <li key={e.institutionId} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-pomme-ink truncate pr-2">{e.institutionNom}</span>
                      <span className="font-semibold text-pomme-leaf-deep shrink-0">{e.revenu.toFixed(2)}$</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      <div>
        <h2 className="text-lg font-display font-semibold text-pomme-leaf-deep mb-3">Rapports imprimables</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {RAPPORTS.map((r) => (
            <a
              key={r.chemin}
              href={construireLien(r.chemin, r.filtres, filtres)}
              target="_blank"
              rel="noreferrer"
              className="press block bg-white rounded-2xl shadow-card p-5 transition-all duration-300 hover:shadow-lifted hover:-translate-y-0.5"
            >
              <div className="font-semibold text-sm text-pomme-leaf-deep">{r.titre}</div>
              <div className="text-xs font-medium text-pomme-ink/65 mt-1.5 leading-relaxed">{r.description}</div>
              <div className="text-xs font-medium text-pomme-ink/50 mt-2">
                Filtres appliqués : {r.filtres.map((f) => LABEL_FILTRE[f]).join(' + ')}
              </div>
              <div className="text-xs font-semibold text-pomme-apple-deep mt-2">Ouvrir le PDF ↗</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
