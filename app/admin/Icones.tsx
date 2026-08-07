// app/admin/Icones.tsx
// Pictogrammes maison (trait, sans dépendance externe) — repris tels quels
// de la présentation officielle du projet pour une continuité visuelle
// parfaite entre le pitch et l'application réelle.
type Props = { className?: string };

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconeInstitution({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M2 10l10-6 10 6-10 6z" />
      <path d="M18 10v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8" />
    </svg>
  );
}

export function IconeRepas({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M6 13a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A4 4 0 0 1 21 7a4 4 0 0 1-2 3.46" />
      <path d="M6 13h12v4a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
    </svg>
  );
}

export function IconeMenu({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

export function IconeDeconnexion({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
