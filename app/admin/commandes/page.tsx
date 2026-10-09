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
import { CHAMP, CHAMP_NU } from '@/lib/ui';

type Ligne = { id: string; taille: string; tardive: boolean; nomResolu: string; prixResolu: string; journee: { id: string; date: string; jourSemaine: string } };
type Commande = {
  id: string;
  createdAt: string;
  modePaiement: string;
  paye: boolean;
  compteParent: { nom: string; courriel: string; telephone: string | null };
  enfant: { prenom: string; nomDeFamille: string; niveau: string; intolerances: string[]; autreIntolerance: string | null; institution: { id: string; nom: string } };
  menu: { id: string; thematiqueRef: { nom: string } | null };
  lignes: Ligne[];
};

const LABEL_TAILLE: Record<string, string> = { PETIT: 'Petit repas', REGULIER: 'Repas régulier', DEUXIEME_SERVICE: 'Portion +' };
const LABEL_PAIEMENT: Record<string, string> = {
  ARGENT: 'Argent comptant',
  VIREMENT_INTERAC: 'Virement Interac',
  CHEQUE: 'Chèque',
  PAYPAL: 'Paypal',
  PREPAYE: 'Entente annuelle',
  SOLDE_PREPAYE: 'Solde prépayé',
  FONDATION: 'Fondation',
};

function exporterCsv(commandes: Commande[]) {
  const entetes = ['Institution', 'Menu', 'Élève', 'Niveau', 'Allergies', 'Parent', 'Courriel', 'Téléphone', 'Mode de paiement', 'Payé', 'Total', 'Détail des journées'];
  const lignes = commandes.map((c) => {
    const total = c.lignes.reduce((s, l) => s + parseFloat(l.prixResolu), 0);
    const detail = c.lignes.map((l) => `${l.journee.jourSemaine} ${jourDuMoisUTC(l.journee.date)}: ${l.nomResolu} (${LABEL_TAILLE[l.taille]})`).join(' | ');
    const allergies = [...c.enfant.intolerances, c.enfant.autreIntolerance].filter(Boolean).join(', ');
    return [
      c.enfant.institution.nom, c.menu.thematiqueRef?.nom || 'Menu', `${c.enfant.prenom} ${c.enfant.nomDeFamille}`, c.enfant.niveau, allergies,
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
  const [rechercheEnfant, setRechercheEnfant] = useState('');
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [vue, setVue] = useState<'liste' | 'rapport'>('liste');
  const [modeSelection, setModeSelection] = useState(false);
  const [selectionnees, setSelectionnees] = useState<Set<string>>(new Set());
  const [modaleAvisOuverte, setModaleAvisOuverte] = useState(false);

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

  const basculerSelection = (id: string) => {
    setSelectionnees((s) => {
      const suivant = new Set(s);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  };

  const quitterModeSelection = () => {
    setModeSelection(false);
    setSelectionnees(new Set());
  };

  const totalRepas = commandes.reduce((n, c) => n + c.lignes.length, 0);
  const revenuEstime = commandes.reduce((n, c) => n + c.lignes.reduce((s, l) => s + parseFloat(l.prixResolu), 0), 0);
  const nonPaye = commandes.filter((c) => !c.paye).reduce((n, c) => n + c.lignes.reduce((s, l) => s + parseFloat(l.prixResolu), 0), 0);

  const institutionsUtilisees = Array.from(new Map(commandes.map((c) => [c.enfant.institution.id, c.enfant.institution])).values());
  const menusUtilises = Array.from(
    new Map(
      commandes
        .filter((c) => !filtreInstitutionId || c.enfant.institution.id === filtreInstitutionId)
        .map((c) => [c.menu.id, { id: c.menu.id, label: c.menu.thematiqueRef?.nom || 'Menu', institutionNom: c.enfant.institution.nom }])
    ).values()
  );

  const filtreNom = rechercheEnfant.trim().toLowerCase();
  const commandesAffichees = commandes.filter(
    (c) =>
      (!filtreInstitutionId || c.enfant.institution.id === filtreInstitutionId) &&
      (!filtreMenuId || c.menu.id === filtreMenuId) &&
      (!filtreNom || `${c.enfant.prenom} ${c.enfant.nomDeFamille}`.toLowerCase().includes(filtreNom))
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
          {vue === 'liste' && (
            <button
              onClick={() => (modeSelection ? quitterModeSelection() : setModeSelection(true))}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${modeSelection ? 'bg-pomme-leaf-deep text-white' : 'bg-white border border-pomme-line/60 text-pomme-ink/85'}`}
            >
              {modeSelection ? 'Annuler la sélection' : 'Envoyer un avis…'}
            </button>
          )}
        </div>
      </div>

      {modeSelection && (
        <div className="sticky top-0 z-30 flex items-center gap-3 bg-pomme-leaf-deep text-white rounded-2xl shadow-lifted px-4 py-3">
          <span className="text-sm font-semibold">
            {selectionnees.size} commande{selectionnees.size > 1 ? 's' : ''} sélectionnée{selectionnees.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setSelectionnees(new Set(commandesAffichees.map((c) => c.id)))}
            className="text-xs font-medium text-pomme-apple-light/90 hover:text-white underline underline-offset-2"
          >
            Tout sélectionner (visible)
          </button>
          <button
            onClick={() => setModaleAvisOuverte(true)}
            disabled={selectionnees.size === 0}
            className="press ml-auto inline-flex min-h-[40px] items-center rounded-xl bg-white px-4 text-sm font-semibold text-pomme-leaf-deep shadow-soft transition-all hover:bg-pomme-apple-light disabled:opacity-50 disabled:pointer-events-none"
          >
            Envoyer un avis
          </button>
        </div>
      )}

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
              className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium border transition-colors ${filtreInstitutionId === null ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep' : 'bg-white border-pomme-line/60 text-pomme-ink/85'}`}
            >
              Toutes les institutions
            </button>
            {institutionsUtilisees.map((i) => (
              <button
                key={i.id}
                onClick={() => { setFiltreInstitutionId(i.id); setFiltreMenuId(null); }}
                className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium border transition-colors ${filtreInstitutionId === i.id ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep' : 'bg-white border-pomme-line/60 text-pomme-ink/85'}`}
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
            className="border border-pomme-line/50 rounded-lg px-3 py-1.5 text-base sm:text-xs font-medium text-pomme-ink/85"
          >
            <option value="">Tous les menus</option>
            {menusUtilises.map((m) => <option key={m.id} value={m.id}>{m.institutionNom} — {m.label}</option>)}
          </select>
        )}
        <input
          value={rechercheEnfant}
          onChange={(e) => setRechercheEnfant(e.target.value)}
          placeholder="Rechercher un enfant…"
          className={CHAMP_NU + " w-48"}
        />
        {/* Le classeur Excel est le format de travail réel de Christine
            (feuille cuisine + feuille détaillée, voir la route). Il exige un
            menu choisi : les colonnes SONT les journées de ce menu-là, deux
            menus mélangés n'auraient aucune colonne commune. Le CSV reste
            offert pour un export brut toutes écoles confondues. */}
        {filtreMenuId ? (
          <a
            href={`/api/menus/${filtreMenuId}/export-xlsx`}
            className="press ml-auto inline-flex min-h-[44px] items-center rounded-xl bg-pomme-apple-deep px-4 text-sm font-semibold text-white shadow-soft transition-all hover:bg-pomme-leaf hover:shadow-lifted"
          >
            Classeur Excel ↓
          </a>
        ) : (
          <span className="ml-auto text-xs font-medium text-pomme-ink/50">
            Choisissez un menu pour obtenir le classeur Excel
          </span>
        )}
        <button onClick={() => exporterCsv(commandesAffichees)} className="press inline-flex min-h-[44px] items-center px-1 text-xs font-medium text-pomme-apple-deep hover:underline">
          CSV brut ↓
        </button>
        {filtreMenuId && (
          <a href={`/api/commandes/rapport-pdf?menuId=${filtreMenuId}`} target="_blank" rel="noreferrer" className="press inline-flex min-h-[44px] items-center px-1 text-xs font-medium text-pomme-apple-deep hover:underline">
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
              <div key={c.id} className={`bg-white rounded-2xl shadow-card p-5 transition-shadow duration-300 hover:shadow-lifted ${modeSelection && selectionnees.has(c.id) ? 'ring-2 ring-pomme-apple-deep' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  {modeSelection && (
                    <input
                      type="checkbox"
                      checked={selectionnees.has(c.id)}
                      onChange={() => basculerSelection(c.id)}
                      className="mt-1 h-5 w-5 shrink-0 accent-pomme-apple-deep"
                      aria-label={`Sélectionner la commande de ${c.enfant.prenom} ${c.enfant.nomDeFamille}`}
                    />
                  )}
                  <button onClick={() => (modeSelection ? basculerSelection(c.id) : setOuverte(estOuverte ? null : c.id))} className="text-left flex-1 min-w-0">
                    <div className="font-semibold text-sm text-pomme-ink">
                      {c.enfant.prenom} {c.enfant.nomDeFamille} — {c.enfant.institution.nom}
                    </div>
                    <div className="text-xs font-medium text-pomme-ink/65 mt-0.5">
                      {c.menu.thematiqueRef?.nom || 'Menu'} · {c.enfant.niveau} · {c.lignes.length} journée{c.lignes.length > 1 ? 's' : ''} · {LABEL_PAIEMENT[c.modePaiement]}
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
                            {l.tardive && (
                              <span className="ml-1.5 text-xs font-bold text-pomme-blush-deep bg-pomme-blush-light rounded-full px-2 py-0.5">
                                Tardive
                              </span>
                            )}
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

      {modaleAvisOuverte && (
        <ModaleAvis
          nbSelectionnees={selectionnees.size}
          nbFamilles={new Set(commandes.filter((c) => selectionnees.has(c.id)).map((c) => c.compteParent.courriel)).size}
          commandeIds={Array.from(selectionnees)}
          onFermer={() => setModaleAvisOuverte(false)}
          onEnvoye={() => { setModaleAvisOuverte(false); quitterModeSelection(); }}
        />
      )}
    </div>
  );
}

function ModaleAvis({
  nbSelectionnees,
  nbFamilles,
  commandeIds,
  onFermer,
  onEnvoye,
}: {
  nbSelectionnees: number;
  nbFamilles: number;
  commandeIds: string[];
  onFermer: () => void;
  onEnvoye: () => void;
}) {
  const [sujet, setSujet] = useState('');
  const [message, setMessage] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const envoyer = async () => {
    if (!sujet.trim() || !message.trim()) {
      setErreur('Le sujet et le message sont requis.');
      return;
    }
    setEnvoiEnCours(true);
    setErreur(null);
    const res = await fetch('/api/admin/commandes/avis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commandeIds, sujet, message }),
    });
    setEnvoiEnCours(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErreur(d.error || 'Envoi impossible.');
      return;
    }
    onEnvoye();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pomme-ink/50" onClick={onFermer}>
      <div className="bg-white rounded-2xl shadow-lifted max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-pomme-leaf-deep">Envoyer un avis</h2>
            <p className="text-xs font-medium text-pomme-ink/65 mt-0.5">
              {nbSelectionnees} commande{nbSelectionnees > 1 ? 's' : ''} sélectionnée{nbSelectionnees > 1 ? 's' : ''} · {nbFamilles} famille{nbFamilles > 1 ? 's' : ''} recevra{nbFamilles > 1 ? 'ont' : ''} le courriel
            </p>
          </div>
          <button onClick={onFermer} className="text-pomme-ink/50 hover:text-pomme-ink text-xl leading-none shrink-0">✕</button>
        </div>

        <label className="block text-sm font-semibold text-pomme-ink/80">
          Sujet
          <input value={sujet} onChange={(e) => setSujet(e.target.value)} placeholder="Ex. : Pas de classe le 7 septembre" className={CHAMP} />
        </label>

        <label className="block text-sm font-semibold text-pomme-ink/80">
          Message
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={8}
            placeholder="Le message sera précédé de « Bonjour [nom du parent], » automatiquement."
            className={CHAMP}
          />
        </label>

        {erreur && <p className="text-sm font-semibold text-status-critical">{erreur}</p>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={onFermer} className="px-4 py-2 rounded-xl text-sm font-semibold text-pomme-ink/70 hover:bg-pomme-soft">
            Annuler
          </button>
          <button
            onClick={envoyer}
            disabled={envoiEnCours}
            className="press inline-flex min-h-[44px] items-center rounded-xl bg-pomme-apple-deep px-5 text-sm font-semibold text-white shadow-soft transition-all hover:bg-pomme-leaf disabled:opacity-60"
          >
            {envoiEnCours ? 'Envoi…' : `Envoyer à ${nbFamilles} famille${nbFamilles > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
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
