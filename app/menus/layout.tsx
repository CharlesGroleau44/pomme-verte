// app/menus/layout.tsx
// Espace PUBLIC (aucune connexion requise — voir middleware.ts) : ce que
// les parents voient. Volontairement plus sobre que /admin — pas de
// sidebar, juste un en-tête de marque et le contenu.
import Link from 'next/link';

export default function MenusPubliqueLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Sobre et blanc, comme le site actuel du traiteur (traiteurlapommeverte.com)
          — pas de dégradé ni de décorations, juste le logo qu'elle utilise déjà. */}
      <header className="border-b border-pomme-line/40">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <Link href="/menus" className="flex items-center gap-3 min-w-0 group">
            <img
              src="/logo.jpeg"
              alt="Traiteur La Pomme Verte"
              className="h-11 w-11 rounded-full object-cover shrink-0 transition-transform duration-300 group-hover:scale-105"
            />
            <span className="text-pomme-leaf-deep font-display font-semibold text-sm sm:text-lg truncate">Traiteur La Pomme Verte</span>
          </Link>
          <Link
            href="/parent/connexion"
            className="press bg-pomme-apple-deep hover:bg-pomme-leaf text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors shrink-0"
          >
            Se connecter
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-8">{children}</main>
    </div>
  );
}
