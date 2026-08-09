'use client';
// app/admin/Sidebar.tsx
// Navigation principale — sidebar fixe en bureau/tablette, remplacée par
// NavMobile.tsx (barre d'onglets en bas) sous md.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconeInstitution, IconeRepas, IconeMenu, IconeCommande, IconeParent, IconeDeconnexion } from './Icones';

const SECTIONS = [
  { href: '/admin/institutions', label: 'Institutions', Icone: IconeInstitution },
  { href: '/admin/repas', label: 'Repas', Icone: IconeRepas },
  { href: '/admin/menus', label: 'Menus', Icone: IconeMenu },
  { href: '/admin/commandes', label: 'Commandes', Icone: IconeCommande },
  { href: '/admin/parents', label: 'Parents', Icone: IconeParent },
];

export default function Sidebar() {
  const pathname = usePathname();

  const deconnecter = async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 md:h-screen md:sticky md:top-0 relative overflow-hidden bg-gradient-to-b from-pomme-leaf-deep to-pomme-leaf text-white">
      <div aria-hidden className="absolute -top-20 -left-16 h-56 w-56 rounded-full bg-pomme-apple-mid/10 blur-3xl animate-float-slow" />
      <div className="relative flex items-center gap-3 px-5 py-6">
        <img src="/logo.jpeg" alt="Traiteur La Pomme Verte" className="h-10 w-10 rounded-full bg-white object-cover shrink-0 shadow-soft" />
        <div className="min-w-0">
          <div className="text-sm font-display font-semibold leading-tight truncate">La Pomme Verte</div>
          <div className="text-xs text-pomme-apple-light/90 leading-tight">Gestion</div>
        </div>
      </div>

      <nav className="relative flex-1 px-3 space-y-1">
        {SECTIONS.map(({ href, label, Icone }) => {
          const actif = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`press flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                actif
                  ? 'bg-white text-pomme-leaf-deep shadow-soft'
                  : 'text-pomme-apple-light/90 hover:bg-white/10 hover:text-white hover:translate-x-0.5'
              }`}
            >
              <Icone className="shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="relative px-3 pb-6 pt-2 border-t border-white/10">
        <button
          onClick={deconnecter}
          className="press flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-pomme-apple-light/90 hover:bg-white/10 hover:text-white transition-colors w-full"
        >
          <IconeDeconnexion className="shrink-0" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
