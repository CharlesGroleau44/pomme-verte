// app/menus/[institutionId]/page.tsx
// Page publique — les menus visibles pour cette institution précise
// (estMenuVisible : publie = true ET dans sa période de service, voir
// lib/menu-logic.ts). Un brouillon n'est jamais visible ici ; un menu
// dont la date limite de commande est dépassée reste visible jusqu'à la
// fin de sa semaine de service (Christine, 8 septembre 2026 — le PDF doit
// rester accessible même commandes fermées).
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { estMenuVisible } from '@/lib/menu-logic';
import { photo } from '@/lib/images';

export const dynamic = 'force-dynamic';

export default async function MenusInstitutionPage({ params }: { params: { institutionId: string } }) {
  const institution = await prisma.institution.findUnique({ where: { id: params.institutionId } });
  if (!institution) notFound();

  const tousLesMenus = await prisma.menu.findMany({
    where: { institutionId: params.institutionId, publie: true },
    orderBy: { periodeDebut: 'desc' },
    include: { thematiqueRef: true },
  });
  const menus = tousLesMenus.filter(estMenuVisible);

  const fmt = (d: Date) => d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' });
  const aujourdhui = new Date();

  return (
    <div className="space-y-6">
      <Link href="/menus" className="press inline-flex items-center min-h-[44px] -ml-1 px-1 text-sm font-medium text-pomme-apple-deep hover:underline">← Toutes les institutions</Link>

      {/* Sur mobile, les trois éléments s'empilent au centre. En une seule
          rangée, il ne reste qu'une quarantaine de pixels pour le nom : les
          noms courts (« St-Pie X ») débordent alors par-dessus le bouton,
          et les longs (« Notre-Dame-de-Liesse ») se coupent sur quatre
          lignes. C'est la largeur disponible qui manque, pas le logo. */}
      <div className="animate-fade-in-up bg-white rounded-2xl shadow-card p-6 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        {institution.logoUrl ? (
          <img {...photo(institution.logoUrl, 320)} alt={institution.nom} className="max-h-16 max-w-[180px] object-contain shrink-0" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-pomme-apple-light to-pomme-apple-mid flex items-center justify-center text-xl font-display font-semibold text-white shrink-0 shadow-soft">
            {institution.nom.charAt(0)}
          </div>
        )}
        <h1 className="text-2xl font-display font-semibold text-pomme-leaf-deep sm:flex-1 min-w-0">{institution.nom}</h1>
        {institution.prospectusUrl && (
          <a
            href={institution.prospectusUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="press shrink-0 w-full sm:w-auto bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf hover:shadow-lifted transition-all"
          >
            Voir le prospectus
          </a>
        )}
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
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Vignette de la thématique — l'image fournie par la
                      cliente est un personnage carré sur fond transparent,
                      donc object-contain (jamais recadré). */}
                  {m.thematiqueRef?.photoUrl && (
                    <img
                      {...photo(m.thematiqueRef.photoUrl, 160)} loading="lazy" decoding="async"
                      alt=""
                      className="w-16 h-16 object-contain shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-pomme-ink">{m.thematiqueRef?.nom || 'Menu'}</div>
                    <div className="text-sm font-medium text-pomme-ink/65">Du {fmt(m.periodeDebut)} au {fmt(m.periodeFin)}</div>
                  </div>
                </div>
                {enCours && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-status-good bg-status-good/10 px-2.5 py-1 rounded-full shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-status-good animate-pulse" />
                    Menu en cours
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
