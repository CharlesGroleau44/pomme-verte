'use client';
// app/parent/compte/page.tsx — Tableau de bord
import Link from 'next/link';
import StatTile from '@/app/admin/dashboard/StatTile';
import { jourDuMoisUTC } from '@/lib/menu-logic';
import { useParentCompte } from './ContexteParent';
import { totalCommande, LABEL_PAIEMENT } from './utils';
import { IconeProfil, IconeEnfants, IconePaiement } from '../Icones';
import AlerteVersement from './AlerteVersement';

export default function TableauDeBordPage() {
  const { parent, commandes } = useParentCompte();

  const maintenant = new Date();
  const commandesCeMois = commandes.filter((c) => {
    const d = new Date(c.createdAt);
    return d.getMonth() === maintenant.getMonth() && d.getFullYear() === maintenant.getFullYear();
  });
  const nonPaye = commandes.filter((c) => !c.paye).reduce((s, c) => s + totalCommande(c), 0);
  const repasCommandes = commandes.reduce((s, c) => s + c.lignes.length, 0);
  const recentes = [...commandes].slice(0, 4);

  // Entente annuelle par enfant depuis le 17 août 2026 (voir lib/entente.ts)
  // — un même compte peut avoir plusieurs enfants avec leur propre forfait ;
  // le tableau de bord agrège l'ensemble pour une vue d'un coup d'œil.
  const enfantsAvecEntente = parent.enfants.filter((e) => e.prepayeAnnuel && e.entente);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="animate-fade-in-up"><StatTile label="Enfants inscrits" valeur={parent.enfants.length} /></div>
        <div className="animate-fade-in-up stagger-1"><StatTile label="Commandes ce mois-ci" valeur={commandesCeMois.length} /></div>
        <div className="animate-fade-in-up stagger-2"><StatTile label="Repas commandés" valeur={repasCommandes} /></div>
        <div className="animate-fade-in-up stagger-3">
          {enfantsAvecEntente.length > 0 ? (
            <StatTile
              label="Repas restants"
              valeur={`${enfantsAvecEntente.reduce((s, e) => s + (e.entente?.repasRestants ?? 0), 0)} / ${enfantsAvecEntente.reduce((s, e) => s + (e.entente?.repasInclus ?? 0), 0)}`}
              sousTexte={
                enfantsAvecEntente.length > 1
                  ? `Sur l'entente annuelle de ${enfantsAvecEntente.length} enfants`
                  : `${enfantsAvecEntente[0].entente?.soldeDollars.toFixed(2)}$ sur l'entente annuelle`
              }
            />
          ) : parent.soldePrepayeActif && parent.soldePrepaye ? (
            <StatTile
              label="Solde prépayé"
              valeur={`${parent.soldePrepaye.disponible.toFixed(2)}$`}
              sousTexte={`${parent.soldePrepaye.totalDepose.toFixed(2)}$ déposé au total`}
            />
          ) : (
            <StatTile label="Non payé" valeur={`${nonPaye.toFixed(2)}$`} />
          )}
        </div>
      </div>

      {enfantsAvecEntente.map((e) => (
        <AlerteVersement key={e.id} versement2={e.entente?.versement2 ?? null} enfantNom={`${e.prenom} ${e.nomDeFamille}`} />
      ))}

      {parent.enfants.length === 0 && (
        <div className="animate-fade-in-up bg-white rounded-2xl shadow-card p-6 text-center space-y-3">
          <p className="text-sm font-semibold text-pomme-ink">Ajoutez votre premier enfant pour commencer à commander.</p>
          <Link href="/parent/compte/enfants" className="press inline-block bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf transition-colors">
            Ajouter un enfant
          </Link>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/parent/compte/profil" className="card-hover bg-white rounded-2xl shadow-card p-5 flex items-center gap-3.5 group">
          <div className="h-11 w-11 rounded-xl bg-pomme-soft flex items-center justify-center text-pomme-apple-deep shrink-0 transition-all duration-300 group-hover:bg-pomme-apple-deep group-hover:text-white group-hover:scale-110">
            <IconeProfil />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-pomme-ink">Mon profil</div>
            <div className="text-xs font-medium text-pomme-ink/60">Coordonnées, mot de passe</div>
          </div>
        </Link>
        <Link href="/parent/compte/enfants" className="card-hover bg-white rounded-2xl shadow-card p-5 flex items-center gap-3.5 group">
          <div className="h-11 w-11 rounded-xl bg-pomme-soft flex items-center justify-center text-pomme-apple-deep shrink-0 transition-all duration-300 group-hover:bg-pomme-apple-deep group-hover:text-white group-hover:scale-110">
            <IconeEnfants />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-pomme-ink">Mes enfants</div>
            <div className="text-xs font-medium text-pomme-ink/60">École, niveau, allergies</div>
          </div>
        </Link>
        <Link href="/parent/compte/paiement" className="card-hover bg-white rounded-2xl shadow-card p-5 flex items-center gap-3.5 group">
          <div className="h-11 w-11 rounded-xl bg-pomme-soft flex items-center justify-center text-pomme-apple-deep shrink-0 transition-all duration-300 group-hover:bg-pomme-apple-deep group-hover:text-white group-hover:scale-110">
            <IconePaiement />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-pomme-ink">Paiements</div>
            <div className="text-xs font-medium text-pomme-ink/60">Mode préféré, historique</div>
          </div>
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-pomme-ink/70 uppercase tracking-wide">Activité récente</h2>
          {commandes.length > 0 && (
            <Link href="/parent/compte/paiement" className="press inline-flex items-center min-h-[44px] -ml-1 px-1 text-sm font-semibold text-pomme-apple-deep hover:underline">
              Tout voir →
            </Link>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-card divide-y divide-pomme-soft overflow-hidden">
          {recentes.map((c) => (
            <Link
              key={c.id}
              href={`/menus/${c.menu.institution.id}/${c.menu.id}`}
              className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-pomme-soft/60 hover:pl-6 transition-all duration-200"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-pomme-ink truncate">
                  {c.enfant.prenom} {c.enfant.nomDeFamille} — {c.menu.thematiqueRef?.nom || 'Menu'}
                </div>
                <div className="text-xs font-medium text-pomme-ink/60 truncate">
                  {c.menu.institution.nom} · {new Date(c.createdAt).toLocaleDateString('fr-CA')} · {LABEL_PAIEMENT[c.modePaiement]}
                </div>
              </div>
              <div className="text-right shrink-0 flex flex-col items-end gap-1">
                <span className="font-bold text-sm text-pomme-leaf-deep">{totalCommande(c).toFixed(2)}$</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${c.paye ? 'bg-status-good/10 text-status-good' : 'bg-status-warning/10 text-status-warning'}`}>
                  {c.paye ? 'PAYÉ' : 'NON PAYÉ'}
                </span>
              </div>
            </Link>
          ))}
          {commandes.length === 0 && (
            <p className="p-5 text-sm text-pomme-ink/65">Aucune commande envoyée pour le moment.</p>
          )}
        </div>
      </div>
    </div>
  );
}
