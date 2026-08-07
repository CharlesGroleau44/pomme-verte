'use client';
// app/admin/BoutonDeconnexion.tsx
import { useRouter } from 'next/navigation';

export default function BoutonDeconnexion() {
  const router = useRouter();

  const deconnecter = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <button onClick={deconnecter} className="text-sm hover:underline ml-auto">
      Déconnexion
    </button>
  );
}
