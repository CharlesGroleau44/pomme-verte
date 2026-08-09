// app/menus/[institutionId]/page.tsx
// Page publique — les menus activement publiés pour cette institution
// précise (estActivementPublie : publie = true ET date limite de
// commande pas encore passée). Un brouillon, ou un menu dont la date
// limite est dépassée, n'est jamais visible ici.
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { estActivementPublie } from '@/lib/menu-logic';

export const dynamic = 'force-dynamic';

export default async function MenusInstitutionPage({ params }: { params: { institutionId: string } }) {
  const institution = await prisma.institution.findUnique({ where: { id: params.institutionId } });
  if (!institution) notFound();

  const tousLesMenus = await prisma.menu.findMany({
    where: { institutionId: params.institutionId, publie: true },
    orderBy: { periodeDebut: 'desc' },
  });
  const menus = tousLesMenus.filter(estActivementPublie);

  const fmt = (d: Date) => d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' });
  const aujourdhui = new Date();

  return (
    <div className="space-y-6">
      <Link href="/menus" className="text-sm font-medium text-pomme-apple-deep hover:underline">← Toutes les institutions</Link>

      <div className="animate-fade-in-up bg-white rounded-2xl shadow-card p-6 flex items-center gap-4">
        {institution.logoUrl ? (
          <img src={institution.logoUrl} alt={institution.nom} className="max-h-16 max-w-[180px] object-contain shrink-0" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-pomme-apple-light to-pomme-apple-mid flex items-center justify-center text-xl font-display font-semibold text-white shrink-0 shadow-soft">
            {institution.nom.charAt(0)}
          </div>
        )}
        <h1 className="text-2xl font-display font-semibold text-pomme-leaf-deep">{institution.nom}</h1>
      </div>

      <div className="space-y-3">
        {menus.map((m, idx) => {
          const enCours = aujourdhui >= m.periodeDebut && aujourdhui <= m.periodeFin;
          return (
            <Link
              key={m.id}
              href={`/menus/${institution.id}/${m.id}`}
              className={`card-hover animate-fade-in-up stagger-${Math.min(idx + 1, 6)} block bg-white rounded-2xl shadow-card p-5 border border-transparent hover:border-pomme-apple-light/60`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-pomme-ink">{m.thematique || 'Menu'}</div>
                  <div className="text-sm font-medium text-pomme-ink/65">Du {fmt(m.periodeDebut)} au {fmt(m.periodeFin)}</div>
                </div>
                {enCours && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-status-good bg-status-good/10 px-2.5 py-1 rounded-full shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-status-good animate-pulse" />
                    En cours
                  </span>
                )}
              </div>
            </Link>
          );
        })}
        {menus.length === 0 && (
          <p className="text-center text-pomme-ink/60 font-medium py-10">Aucun menu publié pour le moment — revenez bientôt !</p>
        )}
      </div>
    </div>
  );
}
