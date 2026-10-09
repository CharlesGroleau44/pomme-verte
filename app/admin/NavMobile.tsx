'use client';
// app/admin/NavMobile.tsx
// Barre d'onglets fixe en bas — remplace la sidebar sous md (même patron
// que les autres apps mobiles de Charles : le réflexe de navigation
// principal au pouce).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconeInstitution, IconeRepas, IconeMenu, IconeThematique, IconeCommande,
  IconeParent, IconeCalendrier, IconeDemande, IconeRegistre, IconeRapport, IconeUtilisateurs,
} from './Icones';

// Cinq onglets, c'est la limite avant que les libellés deviennent illisibles
// sous 375 px — d'où les libellés courts ici (« Écoles » plutôt que
// « Institutions »), la sidebar bureau gardant les noms longs.
const PRINCIPALES = [
  { href: '/admin/institutions', label: 'Écoles', Icone: IconeInstitution },
  { href: '/admin/repas', label: 'Repas', Icone: IconeRepas },
  { href: '/admin/menus', label: 'Menus', Icone: IconeMenu },
  { href: '/admin/commandes', label: 'Commandes', Icone: IconeCommande },
];

// Le reste vit derrière « Plus ». Avant, ces sections n'étaient tout
// simplement PAS dans la barre : sur téléphone, Calendriers et Demandes
// étaient inaccessibles autrement qu'en tapant l'URL à la main — et
// Demandes est justement là où arrivent les demandes de paiement annuel.
const SECONDAIRES = [
  { href: '/admin/dashboard', label: 'Tableau de bord', Icone: IconeRapport },
  { href: '/admin/parents', label: 'Parents', Icone: IconeParent },
  { href: '/admin/registre', label: 'Registre', Icone: IconeRegistre },
  { href: '/admin/demandes', label: 'Demandes', Icone: IconeDemande },
  { href: '/admin/thematiques', label: 'Thématiques', Icone: IconeThematique },
  { href: '/admin/calendriers', label: 'Calendriers', Icone: IconeCalendrier },
];

type Moi = { nom: string; role: 'ADMIN' | 'GESTIONNAIRE' };

export default function NavMobile() {
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const [moi, setMoi] = useState<Moi | null>(null);

  useEffect(() => {
    fetch('/api/admin/moi').then((r) => (r.ok ? r.json() : null)).then(setMoi).catch(() => {});
  }, []);

  // Refermer le panneau dès qu'on change de page, sinon il reste ouvert
  // par-dessus la section qu'on vient d'atteindre.
  useEffect(() => { setOuvert(false); }, [pathname]);

  const secondaires = moi?.role === 'ADMIN'
    ? [...SECONDAIRES, { href: '/admin/utilisateurs', label: 'Utilisateurs', Icone: IconeUtilisateurs }]
    : SECONDAIRES;

  const dansLeMenu = secondaires.some((s) => pathname.startsWith(s.href));

  return (
    <>
      {ouvert && (
        <>
          <button
            aria-label="Fermer le menu"
            onClick={() => setOuvert(false)}
            className="md:hidden fixed inset-0 bg-pomme-ink/40 z-40 animate-fade-in-up"
          />
          <div className="md:hidden fixed inset-x-0 bottom-[60px] z-50 bg-white rounded-t-2xl shadow-lifted pb-[env(safe-area-inset-bottom)] animate-fade-in-up">
            <div className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-wide text-pomme-ink/50">
              Autres sections
            </div>
            {secondaires.map(({ href, label, Icone }) => {
              const actif = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-4 min-h-[52px] text-sm font-semibold border-t border-pomme-line/40 ${
                    actif ? 'text-pomme-apple-deep bg-pomme-soft/60' : 'text-pomme-ink'
                  }`}
                >
                  <Icone className="shrink-0" />
                  {label}
                </Link>
              );
            })}
            <a
              href="/api/guide-commande/pdf"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 px-4 min-h-[52px] text-sm font-semibold text-pomme-ink border-t border-pomme-line/40"
            >
              Guide de commande (PDF)
            </a>
          </div>
        </>
      )}

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-pomme-leaf-deep border-t border-white/10 flex pb-[env(safe-area-inset-bottom)] z-50">
        {PRINCIPALES.map(({ href, label, Icone }) => {
          const actif = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-2 text-[11px] font-medium transition-all duration-200 ${
                actif ? 'text-white scale-105' : 'text-pomme-apple-light/85'
              }`}
            >
              <Icone className={`transition-transform duration-200 ${actif ? 'text-white -translate-y-0.5' : 'text-pomme-apple-light/85'}`} />
              {label}
            </Link>
          );
        })}
        <button
          onClick={() => setOuvert((o) => !o)}
          aria-expanded={ouvert}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-2 text-[11px] font-medium transition-all duration-200 ${
            ouvert || dansLeMenu ? 'text-white scale-105' : 'text-pomme-apple-light/85'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
          </svg>
          Plus
        </button>
      </nav>
    </>
  );
}
