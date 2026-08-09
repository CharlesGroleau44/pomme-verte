// app/menus/page.tsx
// Page publique — la liste de toutes les institutions desservies,
// chacune avec son logo et un bouton vers ses menus. Patron repris de
// la page « Votre école » du site actuel du traiteur, aux couleurs de
// la nouvelle plateforme.
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { estActivementPublie } from '@/lib/menu-logic';

export const dynamic = 'force-dynamic';

export default async function ListeInstitutionsPage() {
  const [institutions, tousLesMenusPublies] = await Promise.all([
    prisma.institution.findMany({ where: { actif: true }, orderBy: { nom: 'asc' } }),
    prisma.menu.findMany({ where: { publie: true }, orderBy: { periodeDebut: 'desc' } }),
  ]);

  // Le menu le plus récent activement publié, par institution — pour
  // pointer directement le bouton PDF sans faire cliquer sur l'école
  // d'abord (la grande majorité n'ont qu'un seul menu actif à la fois).
  const menuActifParInstitution = new Map<string, (typeof tousLesMenusPublies)[number]>();
  for (const m of tousLesMenusPublies) {
    if (estActivementPublie(m) && !menuActifParInstitution.has(m.institutionId)) {
      menuActifParInstitution.set(m.institutionId, m);
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2 animate-fade-in-up">
        <h1 className="text-4xl font-display font-semibold text-pomme-leaf-deep">Votre institution</h1>
        <p className="text-pomme-ink/70 font-medium">Choisissez votre école, CPE ou RPA pour consulter son menu.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {institutions.map((i, idx) => {
          const menuActif = menuActifParInstitution.get(i.id);
          return (
            <div
              key={i.id}
              className={`card-hover animate-fade-in-up stagger-${Math.min(idx + 1, 6)} bg-white rounded-2xl shadow-card p-6 flex flex-col items-center text-center gap-3 border border-transparent hover:border-pomme-apple-light/60`}
            >
              <div className="h-20 flex items-center justify-center">
                {i.logoUrl ? (
                  <img src={i.logoUrl} alt={i.nom} className="max-h-20 max-w-[220px] object-contain" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-pomme-apple-light to-pomme-apple-mid flex items-center justify-center text-2xl font-display font-semibold text-white shadow-soft">
                    {i.nom.charAt(0)}
                  </div>
                )}
              </div>
              <h2 className="text-lg font-bold text-pomme-ink">{i.nom}</h2>
              {(i.telephone || i.courriel) && (
                <div className="text-xs font-medium text-pomme-ink/65 space-y-0.5">
                  {i.telephone && <div>{i.telephone}</div>}
                  {i.courriel && <div>{i.courriel}</div>}
                </div>
              )}
              <div className="mt-2 flex flex-col gap-2 w-full">
                <Link
                  href={`/menus/${i.id}`}
                  className="press bg-pomme-apple-deep text-white rounded-xl px-5 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf hover:shadow-lifted transition-all"
                >
                  Commandez en ligne
                </Link>
                {menuActif && (
                  <a
                    href={`/api/menus/${menuActif.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="press bg-white border border-pomme-line/60 text-pomme-ink rounded-xl px-5 py-2.5 text-sm font-semibold hover:border-pomme-apple-deep hover:text-pomme-apple-deep transition-colors"
                  >
                    Téléchargez le menu
                  </a>
                )}
              </div>
            </div>
          );
        })}
        {institutions.length === 0 && (
          <p className="col-span-2 text-center text-pomme-ink/60 font-medium py-10">Aucune institution pour le moment.</p>
        )}
      </div>
    </div>
  );
}
