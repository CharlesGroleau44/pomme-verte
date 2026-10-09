// app/menus/layout.tsx
// Espace PUBLIC (aucune connexion requise — voir middleware.ts) : ce que
// les parents voient. Volontairement plus sobre que /admin — pas de
// sidebar, juste un en-tête de marque et le contenu.
import Link from 'next/link';
import LienConnexion from './LienConnexion';

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
            {/* Sur un écran de 375 px, « Traiteur La Pomme Verte » sur une
                seule ligne se faisait couper en « Traiteur La Pomme … ».
                Deux lignes serrées plutôt qu'un nom tronqué. */}
            <span className="text-pomme-leaf-deep font-display font-semibold text-sm sm:text-lg leading-tight">Traiteur La Pomme Verte</span>
          </Link>
          <LienConnexion />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-8">{children}</main>
    </div>
  );
}
