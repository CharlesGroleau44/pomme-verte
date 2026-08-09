// app/menus/[institutionId]/[menuId]/page.tsx
// Page publique — le menu jour par jour, en LECTURE SEULE (aucun
// contrôle d'édition). N'affiche que si ce menu appartient à CETTE
// institution précise ET qu'il est activement publié (publie = true
// ET date limite de commande pas encore passée) — un lien deviné vers
// un menu d'une autre institution, un brouillon, ou un menu expiré
// mène à « introuvable ».
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { estActivementPublie } from '@/lib/menu-logic';
import FormulaireCommande from './FormulaireCommande';

export const dynamic = 'force-dynamic';

export default async function MenuPubliePage({ params }: { params: { institutionId: string; menuId: string } }) {
  const menu = await prisma.menu.findUnique({
    where: { id: params.menuId },
    include: {
      institution: true,
      journees: {
        include: { selections: { include: { repas: true }, orderBy: { createdAt: 'asc' } } },
        orderBy: { date: 'asc' },
      },
    },
  });

  if (!menu || menu.institutionId !== params.institutionId || !estActivementPublie(menu)) notFound();

  const fmt = (d: Date) => d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6">
      <Link href={`/menus/${params.institutionId}`} className="text-sm font-medium text-pomme-apple-deep hover:underline">
        ← {menu.institution.nom}
      </Link>

      <div className="animate-fade-in-up">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-semibold text-pomme-leaf-deep">{menu.thematique || 'Menu'}</h1>
            <p className="text-sm font-medium text-pomme-ink/65 mt-1">Du {fmt(menu.periodeDebut)} au {fmt(menu.periodeFin)}</p>
          </div>
          <a
            href={`/api/menus/${menu.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="press shrink-0 inline-flex items-center gap-2 bg-white border border-pomme-line/60 text-pomme-ink rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:border-pomme-apple-deep hover:text-pomme-apple-deep transition-colors"
          >
            📄 Version PDF
          </a>
        </div>
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-pomme-blush-deep bg-pomme-blush-light rounded-full px-3 py-1 mt-3">
          ⏳ Date limite de commande : {fmt(menu.dateLimiteCommande)}
        </p>
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
                  <div key={s.id} className="flex items-center gap-3.5 group">
                    {s.repas.photoUrl ? (
                      <img
                        src={s.repas.photoUrl}
                        alt=""
                        className="w-16 h-16 object-cover rounded-xl border border-pomme-soft shrink-0 shadow-soft transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-pomme-soft shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-pomme-ink">{nom}</div>
                      {description && <div className="text-xs font-medium text-pomme-ink/65">{description}</div>}
                      <div className="text-xs font-medium text-pomme-ink/60 mt-0.5">
                        {menu.institution.offreFormatPetit && `Petit repas ${prixPetit.toString()}$ · `}
                        Repas régulier {prixRegulier.toString()}$ · Repas + 2ᵉ service {prixDeuxieme.toString()}$
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
        menuId={menu.id}
        offreFondation={menu.institution.offreFondation}
        offreFormatPetit={menu.institution.offreFormatPetit}
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
