// app/menus/[institutionId]/page.tsx
// Page publique — les menus PUBLIÉS pour cette institution précise
// (MenuInstitution.publie = true seulement ; un brouillon n'est
// jamais visible ici, peu importe l'avancement du montage).
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function MenusInstitutionPage({ params }: { params: { institutionId: string } }) {
  const institution = await prisma.institution.findUnique({ where: { id: params.institutionId } });
  if (!institution) notFound();

  const liens = await prisma.menuInstitution.findMany({
    where: { institutionId: params.institutionId, publie: true },
    include: { menu: true },
    orderBy: { menu: { periodeDebut: 'desc' } },
  });

  const fmt = (d: Date) => d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' });
  const aujourdhui = new Date();

  return (
    <div className="space-y-6">
      <Link href="/menus" className="text-sm font-medium text-pomme-apple-deep hover:underline">← Toutes les institutions</Link>

      <div className="flex items-center gap-4">
        {institution.logoUrl ? (
          <img src={institution.logoUrl} alt={institution.nom} className="h-16 w-16 rounded-full object-cover border border-pomme-soft shrink-0" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-pomme-soft flex items-center justify-center text-xl font-extrabold text-pomme-apple-deep shrink-0">
            {institution.nom.charAt(0)}
          </div>
        )}
        <h1 className="text-2xl font-extrabold text-pomme-leaf-deep">{institution.nom}</h1>
      </div>

      <div className="space-y-3">
        {liens.map((l) => {
          const enCours = aujourdhui >= l.menu.periodeDebut && aujourdhui <= l.menu.periodeFin;
          return (
            <Link
              key={l.id}
              href={`/menus/${institution.id}/${l.menu.id}`}
              className="block bg-white rounded-2xl shadow-card p-5 hover:shadow-lifted transition-shadow"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-pomme-ink">{l.menu.thematique || 'Menu'}</div>
                  <div className="text-sm font-medium text-pomme-ink/65">Du {fmt(l.menu.periodeDebut)} au {fmt(l.menu.periodeFin)}</div>
                </div>
                {enCours && (
                  <span className="text-xs font-semibold text-status-good bg-status-good/10 px-2.5 py-1 rounded-full shrink-0">En cours</span>
                )}
              </div>
            </Link>
          );
        })}
        {liens.length === 0 && (
          <p className="text-center text-pomme-ink/60 font-medium py-10">Aucun menu publié pour le moment — revenez bientôt !</p>
        )}
      </div>
    </div>
  );
}
