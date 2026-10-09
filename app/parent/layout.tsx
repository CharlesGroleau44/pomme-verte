// app/parent/layout.tsx
// Espace parent (compte, enfants, historique de commandes) — même
// habillage sobre que /menus (voir app/menus/layout.tsx), monde
// totalement séparé de /admin (voir middleware.ts).
import Link from 'next/link';

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-pomme-cream">
      <header className="relative overflow-hidden bg-gradient-to-br from-pomme-leaf-deep via-pomme-leaf-deep to-pomme-leaf">
        <div aria-hidden className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-pomme-apple-mid/20 blur-3xl animate-float-slow" />
        <div className="relative max-w-5xl mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <Link href="/menus" className="flex items-center gap-3 min-w-0 group">
            <img
              src="/logo.jpeg"
              alt="Traiteur La Pomme Verte"
              className="h-10 w-10 rounded-full bg-white object-cover shrink-0 shadow-soft transition-transform duration-300 group-hover:scale-105"
            />
            <span className="text-white font-extrabold truncate">Traiteur La Pomme Verte</span>
          </Link>
          <Link
            href="/menus"
            className="press inline-flex items-center min-h-[44px] bg-white/10 hover:bg-white/20 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors shrink-0 backdrop-blur"
          >
            ← Les menus
          </Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-5 py-8">{children}</main>
    </div>
  );
}
