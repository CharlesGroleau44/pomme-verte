'use client';
// app/admin/TopBarMobile.tsx
// En-tête compact visible uniquement sous md — la sidebar porte la même
// information en bureau/tablette.
import { IconeDeconnexion } from './Icones';

export default function TopBarMobile() {
  const deconnecter = async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 bg-pomme-leaf-deep text-white sticky top-0 z-30">
      <div className="flex items-center gap-2.5 min-w-0">
        <img src="/logo.jpeg" alt="" className="h-8 w-8 rounded-full bg-white object-cover shrink-0" />
        <span className="text-sm font-bold truncate">La Pomme Verte</span>
      </div>
      <button onClick={deconnecter} aria-label="Déconnexion" className="text-pomme-apple-light/90 hover:text-white p-1.5">
        <IconeDeconnexion />
      </button>
    </header>
  );
}
