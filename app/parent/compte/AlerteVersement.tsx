// app/parent/compte/AlerteVersement.tsx
// Alerte du 2e versement de l'entente annuelle — partagée entre le
// tableau de bord et la page Paiements pour ne pas dupliquer la logique
// d'affichage (préavis vs retard). N'apparaît que si versements = 2, le
// 2e n'est pas encore marqué reçu, et une échéance est fixée — voir
// etatVersement() dans lib/entente.ts (calculé côté serveur).
import type { EtatVersement } from './ContexteParent';

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export default function AlerteVersement({ versement2, enfantNom }: { versement2: EtatVersement | null; enfantNom?: string }) {
  if (!versement2 || !versement2.approche) return null;

  return (
    <div
      className={`animate-fade-in-up rounded-2xl shadow-card p-5 flex items-start gap-3 ${
        versement2.enRetard ? 'bg-status-critical/10' : 'bg-status-warning/10'
      }`}
    >
      <span className="text-2xl shrink-0">{versement2.enRetard ? '⚠️' : '📅'}</span>
      <div className="min-w-0">
        <div className={`text-sm font-bold ${versement2.enRetard ? 'text-status-critical' : 'text-status-warning'}`}>
          {versement2.enRetard
            ? `2e versement${enfantNom ? ` (${enfantNom})` : ''} en retard depuis le ${fmt(versement2.dateEcheance)}`
            : `2e versement${enfantNom ? ` (${enfantNom})` : ''} à venir — ${fmt(versement2.dateEcheance)}`}
        </div>
        <p className="text-sm font-medium text-pomme-ink/70 mt-0.5">
          {versement2.montant.toFixed(2)}$ pour compléter l&rsquo;entente annuelle.
          {!versement2.enRetard && ` Dans ${versement2.joursRestants} jour${versement2.joursRestants > 1 ? 's' : ''}.`}
        </p>
      </div>
    </div>
  );
}
