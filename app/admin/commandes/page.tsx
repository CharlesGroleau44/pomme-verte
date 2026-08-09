'use client';
// app/admin/commandes/page.tsx
// La version numérique du classeur de coupons-réponses papier : chaque
// commande envoyée par un parent, avec le détail jour par jour,
// filtrable par institution et par menu, statut de paiement, et un
// rapport de préparation agrégé par journée (l'outil du matin pour la
// cuisine). Remplace le tri manuel des enveloppes.
import { useEffect, useState } from 'react';
import StatTile from '../dashboard/StatTile';
import { jourDuMoisUTC } from '@/lib/menu-logic';

type Ligne = { id: string; taille: string; nomResolu: string; prixResolu: string; journee: { id: string; date: string; jourSemaine: string } };
type Commande = {
  id: string;
  createdAt: string;
  modePaiement: string;
  paye: boolean;
  compteParent: { nom: string; courriel: string; telephone: string | null };
  enfant: { prenom: string; nomDeFamille: string; niveau: string; intolerances: string[]; autreIntolerance: string | null; institution: { id: string; nom: string } };
  menu: { id: string; thematique: string | null };
  lignes: Ligne[];
};

const LABEL_TAILLE: Record<string, string> = { PETIT: 'Petit repas', REGULIER: 'Repas régulier', DEUXIEME_SERVICE: '+ 2ᵉ service' };
const LABEL_PAIEMENT: Record<string, string> = {
  ARGENT: 'Argent comptant',
  VIREMENT_INTERAC: 'Virement Interac',
  CHEQUE: 'Chèque',
  PAYPAL: 'Paypal',
  PREPAYE: 'Prépayé',
  FONDATION: 'Fondation',
};

function exporterCsv(commandes: Commande[]) {
  const entetes = ['Institution', 'Menu', 'Élève', 'Niveau', 'Allergies', 'Parent', 'Courriel', 'Téléphone', 'Mode de paiement', 'Payé', 'Total', 'Détail des journées'];
  const lignes = commandes.map((c) => {
    const total = c.lignes.reduce((s, l) => s + parseFloat(l.prixResolu), 0);
    const detail = c.lignes.map((l) => `${l.journee.jourSemaine} ${jourDuMoisUTC(l.journee.date)}: ${l.nomResolu} (${LABEL_TAILLE[l.taille]})`).join(' | ');
    const allergies = [...c.enfant.intolerances, c.enfant.autreIntolerance].filter(Boolean).join(', ');
    return [
      c.enfant.institution.nom, c.menu.thematique || 'Menu', `${c.enfant.prenom} ${c.enfant.nomDeFamille}`, c.enfant.niveau, allergies,
      c.compteParent.nom, c.compteParent.courriel, c.compteParent.telephone || '', LABEL_PAIEMENT[c.modePaiement], c.paye ? 'Oui' : 'Non',
      total.toFixed(2), detail,
    ];
  });
  const echapper = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [entetes, ...lignes].map((rangee) => rangee.map(echapper).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CommandesPage() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [charge, setCharge] = useState(false);
  const [filtreInstitutionId, setFiltreInstitutionId] = useState<string | null>(null);
  const [filtreMenuId, setFiltreMenuId] = useState<string | null>(null);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [vue, setVue] = useState<'liste' | 'rapport'>('liste');

  const charger = () => {
    fetch('/api/commandes').then((r) => r.json()).then((d) => { setCommandes(d); setCharge(true); });
  };
  useEffect(charger, []);

  const basculerPaye = async (c: Commande) => {
    await fetch(`/api/commandes/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paye: !c.paye }),
    });
    charger();
  };

  const totalRepas = commandes.reduce((n, c) => n + c.lignes.length, 0);
  const revenuEstime = commandes.reduce((n, c) => n + c.lignes.reduce((s, l) => s + parseFloat(l.prixResolu), 0), 0);
  const nonPaye = commandes.filter((c) => !c.paye).reduce((n, c) => n + c.lignes.reduce((s, l) => s + parseFloat(l.prixResolu), 0), 0);

  const institutionsUtilisees = Array.from(new Map(commandes.map((c) => [c.enfant.institution.id, c.enfant.institution])).values());
  const menusUtilises = Array.from(
    new Map(
      commandes
        .filter((c) => !filtreInstitutionId || c.enfant.institution.id === filtreInstitutionId)
        .map((c) => [c.menu.id, { id: c.menu.id, label: c.menu.thematique || 'Menu', institutionNom: c.enfant.institution.nom }])
    ).values()
  );

  const commandesAffichees = commandes.filter(
    (c) => (!filtreInstitutionId || c.enfant.institution.id === filtreInstitutionId) && (!filtreMenuId || c.menu.id === filtreMenuId)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-display font-semibold text-pomme-leaf-deep">Commandes</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setVue('liste')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${vue === 'liste' ? 'bg-pomme-apple-deep text-white' : 'bg-white border border-pomme-line/60 text-pomme-ink/85'}`}
          >
            Commandes
          </button>
          <button
            onClick={() => setVue('rapport')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${vue === 'rapport' ? 'bg-pomme-apple-deep text-white' : 'bg-white border border-pomme-line/60 text-pomme-ink/85'}`}
          >
            Rapport de préparation
          </button>
        </div>
      </div>

      {charge && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile label="Commandes reçues" valeur={commandes.length} />
          <StatTile label="Repas commandés" valeur={totalRepas} />
          <StatTile label="Revenu estimé" valeur={`${revenuEstime.toFixed(2)}$`} />
          <StatTile label="Non payé" valeur={`${nonPaye.toFixed(2)}$`} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {institutionsUtilisees.length > 1 && (
          <>
            <button
              onClick={() => { setFiltreInstitutionId(null); setFiltreMenuId(null); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filtreInstitutionId === null ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep' : 'bg-white border-pomme-line/60 text-pomme-ink/85'}`}
            >
              Toutes les institutions
            </button>
            {institutionsUtilisees.map((i) => (
              <button
                key={i.id}
                onClick={() => { setFiltreInstitutionId(i.id); setFiltreMenuId(null); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filtreInstitutionId === i.id ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep' : 'bg-white border-pomme-line/60 text-pomme-ink/85'}`}
              >
                {i.nom}
              </button>
            ))}
          </>
        )}
        {menusUtilises.length > 0 && (
          <select
            value={filtreMenuId ?? ''}
            onChange={(e) => setFiltreMenuId(e.target.value || null)}
            className="border border-pomme-line/50 rounded-lg px-3 py-1.5 text-xs font-medium text-pomme-ink/85"
          >
            <option value="">Tous les menus</option>
            {menusUtilises.map((m) => <option key={m.id} value={m.id}>{m.institutionNom} — {m.label}</option>)}
          </select>
        )}
        <button onClick={() => exporterCsv(commandesAffichees)} className="text-xs font-medium text-pomme-apple-deep hover:underline ml-auto">
          Exporter CSV ↓
        </button>
        {filtreMenuId && (
          <a href={`/api/commandes/rapport-pdf?menuId=${filtreMenuId}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-pomme-apple-deep hover:underline">
            Rapport PDF ↗
          </a>
        )}
      </div>

      {vue === 'liste' ? (
        <div className="space-y-3">
          {commandesAffichees.map((c) => {
            const total = c.lignes.reduce((s, l) => s + parseFloat(l.prixResolu), 0);
            const estOuverte = ouverte === c.id;
            return (
              <div key={c.id} className="bg-white rounded-2xl shadow-card p-5 transition-shadow duration-300 hover:shadow-lifted">
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => setOuverte(estOuverte ? null : c.id)} className="text-left flex-1 min-w-0">
                    <div className="font-semibold text-sm text-pomme-ink">
                      {c.enfant.prenom} {c.enfant.nomDeFamille} — {c.enfant.institution.nom}
                    </div>
                    <div className="text-xs font-medium text-pomme-ink/65 mt-0.5">
                      {c.menu.thematique || 'Menu'} · {c.enfant.niveau} · {c.lignes.length} journée{c.lignes.length > 1 ? 's' : ''} · {LABEL_PAIEMENT[c.modePaiement]}
                    </div>
                    {(c.enfant.intolerances.length > 0 || c.enfant.autreIntolerance) && (
                      <div className="text-xs font-semibold text-status-warning mt-0.5">
                        ⚠ {[...c.enfant.intolerances, c.enfant.autreIntolerance].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </button>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                    <div className="font-bold text-sm text-pomme-leaf-deep">{total.toFixed(2)}$</div>
                    <button
                      onClick={() => basculerPaye(c)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${c.paye ? 'bg-status-good text-white' : 'bg-status-critical text-white'}`}
                    >
                      {c.paye ? 'PAYÉ' : 'NON PAYÉ'}
                    </button>
                    <button onClick={() => setOuverte(estOuverte ? null : c.id)} className="text-xs font-medium text-pomme-apple-deep">
                      {estOuverte ? 'Fermer' : 'Détail'}
                    </button>
                  </div>
                </div>

                {estOuverte && (
                  <div className="mt-4 pt-4 border-t border-pomme-line/50 space-y-3">
                    <div className="text-xs font-medium text-pomme-ink/65">
                      Parent : {c.compteParent.nom} · {c.compteParent.courriel}{c.compteParent.telephone ? ` · ${c.compteParent.telephone}` : ''}
                    </div>
                    <div className="space-y-1.5">
                      {c.lignes.map((l) => (
                        <div key={l.id} className="flex items-center justify-between text-sm">
                          <span className="text-pomme-ink">
                            <span className="font-semibold">{l.journee.jourSemaine} {jourDuMoisUTC(l.journee.date)}</span>
                            {' — '}{l.nomResolu} ({LABEL_TAILLE[l.taille]})
                          </span>
                          <span className="font-medium text-pomme-ink/70 shrink-0">{l.prixResolu}$</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {charge && commandesAffichees.length === 0 && (
            <p className="text-sm text-pomme-ink/65">Aucune commande reçue pour le moment.</p>
          )}
        </div>
      ) : (
        <RapportPreparation commandes={commandesAffichees} menuChoisiId={filtreMenuId} />
      )}
    </div>
  );
}

function RapportPreparation({ commandes, menuChoisiId }: { commandes: Commande[]; menuChoisiId: string | null }) {
  if (!menuChoisiId) {
    return <p className="text-sm text-pomme-ink/65">Choisissez un menu ci-dessus pour voir le rapport de préparation.</p>;
  }

  type Cle = string;
  const parJournee = new Map<Cle, { jourSemaine: string; date: string; parPlat: Map<string, number> }>();

  for (const c of commandes) {
    for (const l of c.lignes) {
      if (!parJournee.has(l.journee.id)) {
        parJournee.set(l.journee.id, { jourSemaine: l.journee.jourSemaine, date: l.journee.date, parPlat: new Map() });
      }
      const jour = parJournee.get(l.journee.id)!;
      const cle = `${l.nomResolu} — ${LABEL_TAILLE[l.taille]}`;
      jour.parPlat.set(cle, (jour.parPlat.get(cle) ?? 0) + 1);
    }
  }

  const journees = Array.from(parJournee.values()).sort((a, b) => a.date.localeCompare(b.date));

  if (journees.length === 0) {
    return <p className="text-sm text-pomme-ink/65">Aucune commande pour ce menu pour le moment.</p>;
  }

  return (
    <div className="space-y-3">
      {journees.map((j) => {
        const totalJour = Array.from(j.parPlat.values()).reduce((n, v) => n + v, 0);
        return (
          <div key={j.date} className="bg-white rounded-2xl shadow-card p-5">
            <div className="flex items-baseline justify-between mb-3">
              <div className="font-bold text-sm text-pomme-ink">{j.jourSemaine} {jourDuMoisUTC(j.date)}</div>
              <div className="text-xs font-semibold text-pomme-apple-deep">{totalJour} repas</div>
            </div>
            <div className="space-y-1.5">
              {Array.from(j.parPlat.entries()).map(([plat, n]) => (
                <div key={plat} className="flex items-center justify-between text-sm">
                  <span className="text-pomme-ink">{plat}</span>
                  <span className="font-bold text-pomme-leaf-deep">{n}×</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
