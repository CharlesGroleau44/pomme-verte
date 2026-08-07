'use client';
// app/admin/dashboard/EntreesRecentes.tsx
import Link from 'next/link';
import { relatif } from '@/lib/dashboard';

export type EntreeRecente = {
  id: string;
  titre: string;
  sousTitre?: string;
  date: Date;
  href?: string;
  vignette?: string | null;
};

export default function EntreesRecentes({ titre, entrees }: { titre: string; entrees: EntreeRecente[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      <h3 className="text-sm font-semibold text-pomme-ink/85 mb-3">{titre}</h3>
      {entrees.length === 0 ? (
        <p className="text-sm text-pomme-ink/65 py-6 text-center">Rien de récent.</p>
      ) : (
        <ul className="divide-y divide-pomme-soft">
          {entrees.map((e) => {
            const contenu = (
              <div className="flex items-center gap-3 py-2.5 min-w-0">
                {e.vignette ? (
                  <img src={e.vignette} alt="" className="h-9 w-9 rounded-lg object-cover shrink-0 border border-pomme-soft" />
                ) : (
                  <div className="h-9 w-9 rounded-lg bg-pomme-soft shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-pomme-ink truncate">{e.titre}</div>
                  {e.sousTitre && <div className="text-xs font-medium text-pomme-ink/65 truncate">{e.sousTitre}</div>}
                </div>
                <div className="text-xs font-medium text-pomme-ink/65 shrink-0">{relatif(e.date)}</div>
              </div>
            );
            return (
              <li key={e.id}>
                {e.href ? (
                  <Link href={e.href} className="block hover:bg-pomme-soft/60 -mx-2 px-2 rounded-lg transition-colors">
                    {contenu}
                  </Link>
                ) : (
                  contenu
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
