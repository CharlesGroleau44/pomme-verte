'use client';
// app/menus/LienConnexion.tsx
// Le bouton « Se connecter » de l'en-tête public — isolé du layout (server
// component) parce qu'il a besoin du chemin courant. Sans le suite=, un
// parent déjà inscrit qui clique ce bouton par réflexe (plutôt que de
// descendre au formulaire de commande, qui gère déjà la connexion en
// place) atterrissait sur son tableau de bord après connexion, pas de
// retour au menu qu'il voulait commander — confusion signalée par
// Christine (courriel du 25 août 2026, captures Pomme 1/Pomme 2).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function LienConnexion() {
  const pathname = usePathname();
  const suite = encodeURIComponent(pathname);
  // Un parent déjà connecté qui navigue les menus voyait quand même
  // « Se connecter » ici — rien ne vérifiait l'état de connexion, renforçant
  // l'impression qu'il fallait se reconnecter avant de commander.
  const [connecte, setConnecte] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/parent/moi').then((r) => setConnecte(r.status !== 401)).catch(() => setConnecte(false));
  }, []);

  if (connecte === null) return null;

  if (connecte) {
    return (
      <Link
        href="/parent/compte"
        className="press inline-flex items-center min-h-[44px] bg-white border border-pomme-line/60 hover:border-pomme-apple-deep text-pomme-ink/85 rounded-xl px-4 py-2 text-sm font-semibold transition-colors shrink-0"
      >
        Mon compte
      </Link>
    );
  }

  return (
    <Link
      href={`/parent/connexion?suite=${suite}`}
      className="press inline-flex items-center min-h-[44px] bg-pomme-apple-deep hover:bg-pomme-leaf text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors shrink-0"
    >
      Se connecter
    </Link>
  );
}
