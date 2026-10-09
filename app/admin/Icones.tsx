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

export function IconeCommande({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M6 2h9l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <path d="M14 2v5h5" />
      <path d="M8 13h8M8 17h5" />
    </svg>
  );
}

export function IconeParent({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2" />
    </svg>
  );
}

export function IconeThematique({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3l2.5 5.5 6 .8-4.3 4.2 1 6-5.2-2.8-5.2 2.8 1-6L3.5 9.3l6-.8z" />
    </svg>
  );
}

export function IconeUtilisateurs({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2" />
      <path d="M17 8a3 3 0 1 1 0-5.9" />
      <path d="M20 21v-1.5a4 4 0 0 0-2.5-3.7" />
    </svg>
  );
}

export function IconeCalendrier({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function IconeDemande({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M4 4h16v12H7l-3 3z" />
      <path d="M9 9h6M9 12h4" />
    </svg>
  );
}

export function IconeRegistre({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

export function IconeRapport({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M8 17V11M12 17V7M16 17v-4" />
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
