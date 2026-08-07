// app/menus/[institutionId]/[menuId]/page.tsx
// Page publique — le menu jour par jour, en LECTURE SEULE (aucun
// contrôle d'édition). N'affiche que si ce menu est publié pour CETTE
// institution précise — un lien deviné vers un menu non publié, ou
// publié pour une autre institution seulement, mène à « introuvable ».
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { journeeApplicableA } from '@/lib/menu-logic';

export const dynamic = 'force-dynamic';

export default async function MenuPubliePage({ params }: { params: { institutionId: string; menuId: string } }) {
  const lien = await prisma.menuInstitution.findUnique({
    where: { menuId_institutionId: { menuId: params.menuId, institutionId: params.institutionId } },
    include: { institution: true },
  });

  if (!lien || !lien.publie) notFound();

  const menu = await prisma.menu.findUnique({
    where: { id: params.menuId },
    include: {
      journees: {
        include: { selections: { include: { repas: true }, orderBy: { createdAt: 'asc' } } },
        orderBy: { date: 'asc' },
      },
    },
  });
  if (!menu) notFound();

  const fmt = (d: Date) => d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' });
  const journeesVisibles = menu.journees.filter((j) => journeeApplicableA(j, params.institutionId));

  return (
    <div className="space-y-6">
      <Link href={`/menus/${params.institutionId}`} className="text-sm font-medium text-pomme-apple-deep hover:underline">
        ← {lien.institution.nom}
      </Link>

      <div>
        <h1 className="text-2xl font-extrabold text-pomme-leaf-deep">{menu.thematique || 'Menu'}</h1>
        <p className="text-sm font-medium text-pomme-ink/65">Du {fmt(menu.periodeDebut)} au {fmt(menu.periodeFin)}</p>
        {menu.dateLimiteCommande && (
          <p className="text-sm font-semibold text-status-warning mt-1">Date limite de commande : {fmt(menu.dateLimiteCommande)}</p>
        )}
      </div>

      <div className="space-y-3">
        {journeesVisibles.map((j) => (
          <div key={j.id} className="bg-white rounded-2xl shadow-card p-5">
            <div className="text-sm font-bold text-pomme-ink mb-3">{j.jourSemaine} {new Date(j.date).getDate()}</div>
            <div className="space-y-3">
              {j.selections.map((s) => {
                const nom = s.nomOverride ?? s.repas.nom;
                const description = s.descriptionOverride ?? s.repas.description;
                const prixPetit = s.prixPetitOverride ?? s.repas.prixPetit;
                const prixRegulier = s.prixRegulierOverride ?? s.repas.prixRegulier;
                const prixDeuxieme = s.prixDeuxiemeServiceOverride ?? s.repas.prixDeuxiemeService;
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    {s.repas.photoUrl ? (
                      <img src={s.repas.photoUrl} alt="" className="w-14 h-14 object-cover rounded-xl border border-pomme-soft shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-pomme-soft shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-pomme-ink">{nom}</div>
                      {description && <div className="text-xs font-medium text-pomme-ink/65">{description}</div>}
                      <div className="text-xs font-medium text-pomme-ink/60">
                        Petit repas {prixPetit.toString()}$ · Repas régulier {prixRegulier.toString()}$ · Repas + 2ᵉ service {prixDeuxieme.toString()}$
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
