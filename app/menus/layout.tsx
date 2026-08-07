// app/menus/layout.tsx
// Espace PUBLIC (aucune connexion requise — voir middleware.ts) : ce que
// les parents voient. Volontairement plus sobre que /admin — pas de
// sidebar, juste un en-tête de marque et le contenu.
import Link from 'next/link';

export default function MenusPubliqueLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-pomme-cream">
      <header className="bg-pomme-leaf-deep">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link href="/menus" className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Traiteur La Pomme Verte" className="h-10 w-10 rounded-full bg-white object-cover shrink-0" />
            <span className="text-white font-extrabold">Traiteur La Pomme Verte</span>
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-8">{children}</main>
    </div>
  );
}
