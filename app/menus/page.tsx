// app/menus/page.tsx
// Page publique — la liste de toutes les institutions desservies,
// chacune avec son logo et un bouton vers ses menus. Patron repris de
// la page « Votre école » du site actuel du traiteur, aux couleurs de
// la nouvelle plateforme.
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ListeInstitutionsPage() {
  const institutions = await prisma.institution.findMany({
    where: { actif: true },
    orderBy: { nom: 'asc' },
  });

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-pomme-leaf-deep">Votre institution</h1>
        <p className="text-pomme-ink/70 font-medium">Choisissez votre école, CPE ou RPA pour consulter son menu.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {institutions.map((i) => (
          <div key={i.id} className="bg-white rounded-2xl shadow-card p-6 flex flex-col items-center text-center gap-3">
            {i.logoUrl ? (
              <img src={i.logoUrl} alt={i.nom} className="h-24 w-24 rounded-full object-cover border border-pomme-soft" />
            ) : (
              <div className="h-24 w-24 rounded-full bg-pomme-soft flex items-center justify-center text-2xl font-extrabold text-pomme-apple-deep">
                {i.nom.charAt(0)}
              </div>
            )}
            <h2 className="text-lg font-bold text-pomme-ink">{i.nom}</h2>
            {(i.telephone || i.courriel) && (
              <div className="text-xs font-medium text-pomme-ink/65 space-y-0.5">
                {i.telephone && <div>{i.telephone}</div>}
                {i.courriel && <div>{i.courriel}</div>}
              </div>
            )}
            <Link
              href={`/menus/${i.id}`}
              className="mt-2 bg-pomme-apple-deep text-white rounded-xl px-5 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf transition-colors"
            >
              Voir le menu
            </Link>
          </div>
        ))}
        {institutions.length === 0 && (
          <p className="col-span-2 text-center text-pomme-ink/60 font-medium py-10">Aucune institution pour le moment.</p>
        )}
      </div>
    </div>
  );
}
