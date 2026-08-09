'use client';
// app/parent/compte/layout.tsx
// Coquille commune à tout l'espace « Mon compte » : un seul fetch de
// /api/parent/moi + /api/parent/institutions + /api/parent/commandes,
// partagé via ContexteParent à toutes les pages filles (Tableau de bord,
// Profil, Enfants, Paiements) — évite de refaire l'appel et la
// redirection 401 sur chaque onglet.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ContexteParent, type Commande, type Institution, type Parent } from './ContexteParent';
import { IconeTableauBord, IconeProfil, IconeEnfants, IconePaiement, IconeDeconnexion } from '../Icones';

const ONGLETS = [
  { href: '/parent/compte', label: 'Tableau de bord', Icone: IconeTableauBord, exact: true },
  { href: '/parent/compte/profil', label: 'Mon profil', Icone: IconeProfil, exact: false },
  { href: '/parent/compte/enfants', label: 'Mes enfants', Icone: IconeEnfants, exact: false },
  { href: '/parent/compte/paiement', label: 'Paiements', Icone: IconePaiement, exact: false },
];

export default function CompteLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [parent, setParent] = useState<Parent | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [charge, setCharge] = useState(false);

  const charger = useCallback(async () => {
    const [moiRes, institutionsRes, commandesRes] = await Promise.all([
      fetch('/api/parent/moi'),
      fetch('/api/parent/institutions'),
      fetch('/api/parent/commandes'),
    ]);
    if (moiRes.status === 401) {
      router.push(`/parent/connexion?suite=${encodeURIComponent(pathname)}`);
      return;
    }
    setParent(await moiRes.json());
    setInstitutions(await institutionsRes.json());
    setCommandes(await commandesRes.json());
    setCharge(true);
  }, [router, pathname]);

  useEffect(() => { charger(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const deconnecter = async () => {
    await fetch('/api/parent/deconnexion', { method: 'POST' });
    router.push('/menus');
    router.refresh();
  };

  if (!charge || !parent) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 rounded-full border-2 border-pomme-apple-mid/40 border-t-pomme-apple-deep animate-spin" />
      </div>
    );
  }

  const initiales = parent.nom.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  return (
    <ContexteParent.Provider value={{ parent, institutions, commandes, recharger: charger }}>
      <div className="space-y-6">
        <div className="animate-fade-in-up relative overflow-hidden bg-gradient-to-br from-pomme-leaf-deep to-pomme-apple-deep rounded-3xl shadow-lifted px-6 py-6 sm:px-8 sm:py-7 flex items-center justify-between gap-4">
          <div aria-hidden className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-pomme-gold/20 blur-3xl animate-float-slow" />
          <div className="relative flex items-center gap-4 min-w-0">
            <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-white font-display font-semibold text-lg shrink-0 shadow-soft">
              {initiales || '👤'}
            </div>
            <div className="min-w-0">
              <div className="text-white font-display font-semibold text-xl sm:text-2xl truncate">Bonjour, {parent.nom.split(' ')[0]}</div>
              <div className="text-pomme-apple-light/90 text-sm font-medium truncate">{parent.courriel}</div>
            </div>
          </div>
          <button
            onClick={deconnecter}
            className="press relative hidden sm:flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors shrink-0 backdrop-blur"
          >
            <IconeDeconnexion />
            Déconnexion
          </button>
        </div>

        <nav className="animate-fade-in-up stagger-1 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {ONGLETS.map(({ href, label, Icone, exact }) => {
            const actif = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`press flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${
                  actif
                    ? 'bg-pomme-apple-deep text-white shadow-soft'
                    : 'bg-white text-pomme-ink/75 border border-pomme-line/50 hover:border-pomme-apple-deep hover:text-pomme-apple-deep'
                }`}
              >
                <Icone className="shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {children}

        <button
          onClick={deconnecter}
          className="press sm:hidden w-full flex items-center justify-center gap-2 bg-white border border-pomme-line/50 text-pomme-ink/70 rounded-xl px-4 py-3 text-sm font-semibold"
        >
          <IconeDeconnexion />
          Déconnexion
        </button>
      </div>
    </ContexteParent.Provider>
  );
}
