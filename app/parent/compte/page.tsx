'use client';
// app/parent/compte/page.tsx — Tableau de bord
import Link from 'next/link';
import StatTile from '@/app/admin/dashboard/StatTile';
import { jourDuMoisUTC } from '@/lib/menu-logic';
import { useParentCompte } from './ContexteParent';
import { totalCommande, LABEL_PAIEMENT } from './utils';
import { IconeProfil, IconeEnfants, IconePaiement } from '../Icones';

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="animate-fade-in-up"><StatTile label="Enfants inscrits" valeur={parent.enfants.length} /></div>
        <div className="animate-fade-in-up stagger-1"><StatTile label="Commandes ce mois-ci" valeur={commandesCeMois.length} /></div>
        <div className="animate-fade-in-up stagger-2"><StatTile label="Repas commandés" valeur={repasCommandes} /></div>
        <div className="animate-fade-in-up stagger-3">
          {parent.prepayeAnnuel ? (
            <StatTile label="Facturation" valeur="Prépayée ✓" sousTexte="Entente annuelle" />
          ) : (
            <StatTile label="Non payé" valeur={`${nonPaye.toFixed(2)}$`} />
          )}
        </div>
      </div>

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
            <Link href="/parent/compte/paiement" className="text-xs font-semibold text-pomme-apple-deep hover:underline">
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
                  {c.enfant.prenom} {c.enfant.nomDeFamille} — {c.menu.thematique || 'Menu'}
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
