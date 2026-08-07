// app/admin/dashboard/StatTile.tsx
// Contrat stat tile (skill dataviz) : label en phrase, valeur en chiffres
// proportionnels (jamais tabular-nums — réservé aux colonnes alignées),
// sous-texte optionnel pour le contexte.
export default function StatTile({
  label,
  valeur,
  sousTexte,
}: {
  label: string;
  valeur: string | number;
  sousTexte?: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5 min-w-0">
      <div className="text-xs font-semibold text-pomme-ink/50 uppercase tracking-wide truncate">{label}</div>
      <div className="text-3xl font-extrabold text-pomme-leaf-deep mt-1.5">{valeur}</div>
      {sousTexte && <div className="text-xs text-pomme-ink/40 mt-1 truncate">{sousTexte}</div>}
    </div>
  );
}
