// app/menus/[institutionId]/[menuId]/page.tsx
// Page publique — le menu jour par jour, en LECTURE SEULE (aucun
// contrôle d'édition). N'affiche que si ce menu appartient à CETTE
// institution précise ET qu'il est visible (publie = true ET dans sa
// période de service, voir estMenuVisible dans lib/menu-logic.ts) — un
// lien deviné vers un menu d'une autre institution, un brouillon, ou un
// menu dont la semaine de service est terminée mène à « introuvable ».
// La date limite de commande, elle, ne gouverne QUE le formulaire plus
// bas (commandesOuvertes) — pas la visibilité de la page ni du PDF
// (Christine, 8 septembre 2026).
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { estMenuVisible, estActivementPublie } from '@/lib/menu-logic';
import FormulaireCommande from './FormulaireCommande';
import { photo } from '@/lib/images';

export const dynamic = 'force-dynamic';

export default async function MenuPubliePage({ params }: { params: { institutionId: string; menuId: string } }) {
  const menu = await prisma.menu.findUnique({
    where: { id: params.menuId },
    include: {
      institution: true,
      thematiqueRef: true,
      journees: {
        include: { selections: { include: { repas: true }, orderBy: { createdAt: 'asc' } } },
        orderBy: { date: 'asc' },
      },
    },
  });

  if (!menu || menu.institutionId !== params.institutionId || !estMenuVisible(menu)) notFound();
  const commandesOuvertes = estActivementPublie(menu);

  const fmt = (d: Date) => d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6">
      <Link href={`/menus/${params.institutionId}`} className="press inline-flex items-center min-h-[44px] -ml-1 px-1 text-sm font-medium text-pomme-apple-deep hover:underline">
        ← {menu.institution.nom}
      </Link>

      {/* En-tête vedette — c'est la première chose que le parent voit en
          arrivant : la thématique doit frapper. Mascotte, titre et plage de
          dates volontairement généreux, sur une carte qui les détache du
          reste de la page. */}
      <div className="animate-fade-in-up bg-gradient-to-br from-white to-pomme-soft/70 rounded-3xl shadow-card p-6 sm:p-9">
        <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8 min-w-0 text-center sm:text-left">
          {/* Illustration carrée (mascotte) sur fond transparent :
              object-contain, jamais recadrée. */}
          {menu.thematiqueRef?.photoUrl && (
            <img
              {...photo(menu.thematiqueRef.photoUrl, 320)}
              alt=""
              className="w-40 h-40 sm:w-56 sm:h-56 object-contain shrink-0 drop-shadow-sm"
            />
          )}
          <div className="min-w-0">
            <h1 className="text-4xl sm:text-5xl font-display font-semibold text-pomme-leaf-deep leading-[1.05]">
              {menu.thematiqueRef?.nom || 'Menu'}
            </h1>
            <p className="text-lg sm:text-xl font-semibold text-pomme-ink/75 mt-2.5">
              Du {fmt(menu.periodeDebut)} au {fmt(menu.periodeFin)}
            </p>
            <p className="inline-flex items-center gap-2 text-sm sm:text-base font-bold text-pomme-blush-deep bg-pomme-blush-light rounded-full px-4 py-1.5 mt-4">
              ⏳ Date limite de commande : {fmt(menu.dateLimiteCommande)}
            </p>

            {/* Le PDF est la porte de sortie pour le parent qui ne commande
                pas en ligne — il doit être visible d'emblée, pas relégué
                dans un coin. D'où le bouton plein, dans le flux du texte.
                Le prospectus est ici aussi (pas seulement sur la liste des
                menus) : c'est la page où un parent atterrit et cherche
                naturellement les deux — Christine ne l'avait pas trouvé
                sur la liste des menus (courriel du 11 août 2026). */}
            <div className="mt-5 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <a
                href={`/api/menus/${menu.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="press inline-flex items-center gap-2.5 bg-pomme-leaf text-white rounded-xl px-6 py-3 text-base font-bold shadow-soft hover:bg-pomme-leaf-deep hover:shadow-lifted transition-all"
              >
                📄 Télécharger le menu en PDF
              </a>
              {menu.institution.prospectusUrl && (
                <a
                  href={menu.institution.prospectusUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="press inline-flex items-center gap-2.5 bg-white text-pomme-leaf-deep border-2 border-pomme-leaf rounded-xl px-6 py-3 text-base font-bold shadow-soft hover:bg-pomme-soft hover:shadow-lifted transition-all"
                >
                  📋 Voir le prospectus
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {menu.journees.map((j, idx) => (
          <div
            key={j.id}
            className={`animate-fade-in-up stagger-${Math.min(idx + 1, 6)} bg-white rounded-2xl shadow-card p-5 hover:shadow-lifted transition-shadow duration-300`}
          >
            <div className="flex items-center gap-2 mb-3.5">
              <span className="inline-flex items-center justify-center h-7 min-w-7 px-1.5 rounded-lg bg-pomme-apple-deep text-white text-xs font-bold">
                {new Date(j.date).getDate()}
              </span>
              <span className="text-sm font-bold text-pomme-ink">{j.jourSemaine}</span>
            </div>
            <div className="space-y-3">
              {j.selections.map((s) => {
                const nom = s.nomOverride ?? s.repas.nom;
                const description = s.descriptionOverride ?? s.repas.description;
                const prixPetit = s.prixPetitOverride ?? s.repas.prixPetit;
                const prixRegulier = s.prixRegulierOverride ?? s.repas.prixRegulier;
                const prixDeuxieme = s.prixDeuxiemeServiceOverride ?? s.repas.prixDeuxiemeService;
                return (
                  <div key={s.id} className="flex items-center gap-4 group">
                    {/* Vignette volontairement généreuse (128px) : c'est la photo
                        du plat qui fait vendre — les parents choisissent d'abord
                        avec les yeux. */}
                    {s.repas.photoUrl ? (
                      <img
                        {...photo(s.repas.photoUrl, 160)} loading="lazy" decoding="async"
                        alt=""
                        className="w-28 h-28 sm:w-32 sm:h-32 object-cover rounded-xl border border-pomme-soft shrink-0 shadow-soft transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-pomme-soft shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-pomme-ink">
                        {nom}
                        {/* Feuille verte en texte plutôt qu'en superposition sur la
                            photo — Christine avait signalé (23 août 2026) que le
                            cadrage de certaines photos coupait l'ancien badge visuel. */}
                        {s.repas.vegetarien && <span className="ml-2 text-xs font-bold text-pomme-leaf-deep align-middle">🌱 Végétarien</span>}
                      </div>
                      {description && <div className="text-sm font-medium text-pomme-ink/65 mt-0.5">{description}</div>}
                      <div className="text-xs font-medium text-pomme-ink/60 mt-1">
                        {menu.institution.offreFormatPetit && `Petit repas ${prixPetit.toString()}$ · `}
                        Repas régulier {prixRegulier.toString()}$ · Portion + {prixDeuxieme.toString()}$
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <FormulaireCommande
        institutionId={params.institutionId}
        institutionNom={menu.institution.nom}
        menuId={menu.id}
        commandesOuvertes={commandesOuvertes}
        prixRepasDepannage={menu.institution.prixRepasDepannage?.toString() ?? null}
        offreFondation={menu.institution.offreFondation}
        offreFormatPetit={menu.institution.offreFormatPetit}
        institutionCourriel={menu.institution.courriel}
        journees={menu.journees.map((j) => ({
          id: j.id,
          jourSemaine: j.jourSemaine,
          date: j.date.toISOString(),
          selections: j.selections.map((s) => ({
            id: s.id,
            nom: s.nomOverride ?? s.repas.nom,
            prixPetit: (s.prixPetitOverride ?? s.repas.prixPetit).toString(),
            prixRegulier: (s.prixRegulierOverride ?? s.repas.prixRegulier).toString(),
            prixDeuxiemeService: (s.prixDeuxiemeServiceOverride ?? s.repas.prixDeuxiemeService).toString(),
          })),
        }))}
      />
    </div>
  );
}
