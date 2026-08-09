// app/parent/Icones.tsx
// Pictogrammes maison de l'espace parent — même vocabulaire visuel que
// app/admin/Icones.tsx (trait, sans dépendance externe) mais fichier
// séparé pour ne pas coupler les deux espaces.
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

export function IconeTableauBord({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="5" rx="2" />
      <rect x="13" y="12" width="8" height="9" rx="2" />
      <rect x="3" y="15" width="8" height="6" rx="2" />
    </svg>
  );
}

export function IconeProfil({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2" />
    </svg>
  );
}

export function IconeEnfants({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="8" cy="8" r="3.2" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M2.5 21v-1.5a5 5 0 0 1 5-5h1a5 5 0 0 1 5 5V21" />
      <path d="M15 21v-1a4 4 0 0 1 4-4h.2a3.8 3.8 0 0 1 3.8 3.8V21" />
    </svg>
  );
}

export function IconePaiement({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
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

export function IconeModifier({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

export function IconeAlerte({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M12 2 1 21h22z" />
      <path d="M12 9v5" />
      <path d="M12 17.5h.01" />
    </svg>
  );
}

export function IconeCadenas({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
