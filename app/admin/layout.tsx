// app/admin/layout.tsx
import Link from 'next/link';
import BoutonDeconnexion from './BoutonDeconnexion';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-800 text-white px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <img src="/logo.jpeg" alt="Traiteur La Pomme Verte" className="h-11 w-11 rounded-full bg-white object-cover" />
          <span className="font-semibold">Traiteur La Pomme Verte — Gestion</span>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin/repas" className="hover:underline">Repas</Link>
            <Link href="/admin/menus" className="hover:underline">Menus</Link>
            {/* TODO Claude Code : ajouter Écoles et Commandes quand ces modules seront construits */}
          </nav>
          <BoutonDeconnexion />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-5 py-6">{children}</main>
    </div>
  );
}
