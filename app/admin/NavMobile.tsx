'use client';
// app/admin/NavMobile.tsx
// Barre d'onglets fixe en bas — remplace la sidebar sous md (même patron
// que les autres apps mobiles de Charles : le réflexe de navigation
// principal au pouce).
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconeInstitution, IconeRepas, IconeMenu, IconeCommande, IconeParent } from './Icones';

const SECTIONS = [
  { href: '/admin/institutions', label: 'Institutions', Icone: IconeInstitution },
  { href: '/admin/repas', label: 'Repas', Icone: IconeRepas },
  { href: '/admin/menus', label: 'Menus', Icone: IconeMenu },
  { href: '/admin/commandes', label: 'Commandes', Icone: IconeCommande },
  { href: '/admin/parents', label: 'Parents', Icone: IconeParent },
];

export default function NavMobile() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-pomme-leaf-deep border-t border-white/10 flex pb-[env(safe-area-inset-bottom)] z-40">
      {SECTIONS.map(({ href, label, Icone }) => {
        const actif = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-all duration-200 ${
              actif ? 'text-white scale-105' : 'text-pomme-apple-light/85'
            }`}
          >
            <Icone className={`transition-transform duration-200 ${actif ? 'text-white -translate-y-0.5' : 'text-pomme-apple-light/85'}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
