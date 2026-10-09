'use client';
// app/parent/compte/paiement/page.tsx
import { useState } from 'react';
import { absenceEncoreAccordable, jourDuMoisUTC } from '@/lib/menu-logic';
import { useParentCompte } from '../ContexteParent';
import { resoudreLigne, totalCommande, LABEL_TAILLE, LABEL_PAIEMENT } from '../utils';
import AlerteVersement from '../AlerteVersement';

// « Entente annuelle » / « Solde prépayé » exclus — voir la même note dans
// FormulaireCommande.tsx : ce sont des statuts de compte, jamais une
// préférence qu'un parent choisit lui-même.
const MODES: { valeur: string; label: string }[] = [
  { valeur: 'ARGENT', label: 'Argent comptant' },
  { valeur: 'VIREMENT_INTERAC', label: 'Virement Interac' },
  { valeur: 'CHEQUE', label: 'Chèque' },
];

export default function PaiementPage() {
  const { parent, commandes, recharger } = useParentCompte();
  const [preference, setPreference] = useState(parent.modePaiementPrefere ?? '');
  const [enCours, setEnCours] = useState(false);
  const [succes, setSucces] = useState(false);
  const [ouverte, setOuverte] = useState<string | null>(null);
  // Clé = `${commandeId}:${journeeId}` — l'absence se signale par journée,
  // pas par commande entière (une seule journée sur cinq peut être manquée).
  const [absenceEnCours, setAbsenceEnCours] = useState<string | null>(null);
  const [absenceMessage, setAbsenceMessage] = useState<{ cle: string; texte: string; erreur: boolean } | null>(null);

  const signalerAbsence = async (commandeId: string, journeeId: string) => {
    const cle = `${commandeId}:${journeeId}`;
    setAbsenceEnCours(cle);
    setAbsenceMessage(null);
    const res = await fetch(`/api/parent/commandes/${commandeId}/absence`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ journeeId }),
    });
    const data = await res.json();
    setAbsenceEnCours(null);
    if (!res.ok) {
      setAbsenceMessage({ cle, texte: data.error, erreur: true });
      return;
    }
    setAbsenceMessage({
      cle,
      texte: data.credite
        ? `✓ Absence enregistrée — ${data.montantCredite.toFixed(2)}$ appliqué à votre solde prépayé.`
        : '✓ Absence enregistrée.',
      erreur: false,
    });
    recharger();
  };

  const enregistrerPreference = async (v: string) => {
    setPreference(v);
    setSucces(false);
    setEnCours(true);
    await fetch('/api/parent/moi', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modePaiementPrefere: v || null }),
    });
    setEnCours(false);
    setSucces(true);
    recharger();
  };

  const totalNonPaye = commandes.filter((c) => !c.paye).reduce((s, c) => s + totalCommande(c), 0);
  const totalPaye = commandes.filter((c) => c.paye).reduce((s, c) => s + totalCommande(c), 0);

  // Entente annuelle par enfant depuis le 17 août 2026 (voir lib/entente.ts)
  // — chacun a son propre forfait/solde, affiché dans sa propre carte.
  const enfantsAvecEntente = parent.enfants.filter((e) => e.prepayeAnnuel && e.entente);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="animate-fade-in-up bg-white rounded-2xl shadow-card p-6 space-y-4">
        <h2 className="text-xl font-display font-semibold text-pomme-leaf-deep">Mode de paiement</h2>

        {enfantsAvecEntente.length > 0 && (
          <div className="space-y-4">
            {enfantsAvecEntente.map((e) => (
              <div key={e.id} className="space-y-3">
                <div className="bg-status-good/10 text-status-good rounded-xl px-4 py-3 text-sm font-semibold">
                  ✓ {e.prenom} {e.nomDeFamille} a une entente annuelle — configurée par le traiteur. Ses commandes ne demandent aucun choix de paiement.
                </div>
                <div className="bg-pomme-soft/60 rounded-xl px-4 py-3.5 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-pomme-leaf-deep">
                      {e.entente!.repasRestants} repas restants sur {e.entente!.repasInclus}
                    </span>
                    <span className="text-sm font-bold text-pomme-apple-deep">{e.entente!.soldeDollars.toFixed(2)}$</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white overflow-hidden">
                    <div
                      className="h-full bg-pomme-apple-deep rounded-full transition-all duration-500"
                      style={{ width: `${(e.entente!.repasRestants / e.entente!.repasInclus) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs font-medium text-pomme-ink/60">
                    {e.entente!.versements === 2
                      ? `Payable en 2 versements de ${e.entente!.montantVersement.toFixed(2)}$.`
                      : 'Payé en un seul versement.'}
                  </p>
                </div>
                <AlerteVersement versement2={e.entente!.versement2} />
              </div>
            ))}
          </div>
        )}

        {parent.soldePrepayeActif && parent.soldePrepaye ? (
          <div className="space-y-3">
            <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${parent.soldePrepaye.disponible > 0 ? 'bg-status-good/10 text-status-good' : 'bg-status-warning/10 text-status-warning'}`}>
              {parent.soldePrepaye.disponible > 0
                ? '✓ Solde prépayé actif — débité au tarif réel de chaque commande.'
                : '⚠ Solde épuisé — contactez le traiteur pour le regarnir.'}
            </div>
            <div className="bg-pomme-soft/60 rounded-xl px-4 py-3.5 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-pomme-leaf-deep">{parent.soldePrepaye.disponible.toFixed(2)}$ disponible</span>
                <span className="text-sm font-bold text-pomme-ink/60">{parent.soldePrepaye.totalDepose.toFixed(2)}$ déposé</span>
              </div>
              <div className="h-2.5 rounded-full bg-white overflow-hidden">
                <div
                  className="h-full bg-pomme-apple-deep rounded-full transition-all duration-500"
                  style={{
                    width: `${parent.soldePrepaye.totalDepose > 0 ? Math.min(100, (parent.soldePrepaye.disponible / parent.soldePrepaye.totalDepose) * 100) : 0}%`,
                  }}
                />
              </div>
              <p className="text-xs font-medium text-pomme-ink/60">{parent.soldePrepaye.consomme.toFixed(2)}$ consommé jusqu&rsquo;à maintenant.</p>
            </div>
            {parent.soldePrepaye.depots.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-pomme-ink/70 uppercase tracking-wide mb-2">Dépôts reçus</h3>
                <div className="space-y-1.5">
                  {parent.soldePrepaye.depots.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-sm bg-pomme-soft/40 rounded-lg px-3 py-2">
                      <span className="font-medium text-pomme-ink/80">{new Date(d.createdAt).toLocaleDateString('fr-CA')}</span>
                      <span className="font-bold text-pomme-leaf-deep">+{d.montant.toFixed(2)}$</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-pomme-ink/65">
              Préremplit automatiquement le mode de paiement à chaque nouvelle commande — vous pourrez toujours le changer au moment de commander.
            </p>
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <button
                  key={m.valeur} type="button" disabled={enCours}
                  onClick={() => enregistrerPreference(m.valeur)}
                  className={`press px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-200 disabled:opacity-60 ${
                    preference === m.valeur ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep shadow-soft scale-105' : 'bg-white border-pomme-line/60 text-pomme-ink/85 hover:border-pomme-apple-deep hover:text-pomme-apple-deep'
                  }`}
                >
                  {m.label}
                </button>
              ))}
              {preference && (
                <button
                  type="button" disabled={enCours}
                  onClick={() => enregistrerPreference('')}
                  className="px-3.5 py-2 rounded-full text-sm font-medium text-pomme-ink/55 hover:text-status-critical transition-colors"
                >
                  Aucune préférence
                </button>
              )}
            </div>
            {succes && <p className="animate-scale-in text-sm text-status-good font-semibold">✓ Préférence enregistrée.</p>}
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="animate-fade-in-up bg-white rounded-2xl shadow-card p-5">
          <div className="text-xs font-semibold text-pomme-ink/70 uppercase tracking-wide">Payé à ce jour</div>
          <div className="text-3xl font-extrabold text-status-good mt-1.5">{totalPaye.toFixed(2)}$</div>
        </div>
        <div className="animate-fade-in-up stagger-1 bg-white rounded-2xl shadow-card p-5">
          <div className="text-xs font-semibold text-pomme-ink/70 uppercase tracking-wide">Non payé</div>
          <div className="text-3xl font-extrabold text-status-warning mt-1.5">{totalNonPaye.toFixed(2)}$</div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-pomme-ink/70 uppercase tracking-wide mb-3">Historique de commandes</h2>
        <div className="space-y-3">
          {commandes.map((c, idx) => {
            const estOuverte = ouverte === c.id;
            return (
              <div key={c.id} className={`animate-fade-in-up stagger-${Math.min(idx + 1, 6)} bg-white rounded-2xl shadow-card p-5 transition-shadow duration-300 hover:shadow-lifted`}>
                <button onClick={() => setOuverte(estOuverte ? null : c.id)} className="w-full flex items-start justify-between gap-3 text-left">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-pomme-ink truncate">
                      {c.enfant.prenom} {c.enfant.nomDeFamille} — {c.menu.thematiqueRef?.nom || 'Menu'}
                    </div>
                    <div className="text-xs font-medium text-pomme-ink/65 mt-0.5">
                      {c.menu.institution.nom} · {new Date(c.createdAt).toLocaleDateString('fr-CA')} · {LABEL_PAIEMENT[c.modePaiement]}
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                    <span className="font-bold text-sm text-pomme-leaf-deep">{totalCommande(c).toFixed(2)}$</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${c.paye ? 'bg-status-good/10 text-status-good' : 'bg-status-warning/10 text-status-warning'}`}>
                      {c.paye ? `PAYÉ${c.payeLe ? ' · ' + new Date(c.payeLe).toLocaleDateString('fr-CA') : ''}` : 'NON PAYÉ'}
                    </span>
                  </div>
                </button>
                {estOuverte && (
                  <div className="mt-4 pt-4 border-t border-pomme-line/50 space-y-2">
                    {c.lignes.map((l) => {
                      const r = resoudreLigne(l);
                      const cle = `${c.id}:${l.journeeId}`;
                      // Le bouton ne s'affiche que tant qu'il servirait à
                      // quelque chose (voir absenceEncoreAccordable) — le
                      // serveur revalide de toute façon à l'heure du
                      // Québec, ceci n'est qu'un raccourci d'affichage.
                      const peutSignaler = absenceEncoreAccordable(l.journee.date);
                      const msg = absenceMessage?.cle === cle ? absenceMessage : null;
                      return (
                        <div key={l.id} className="text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-pomme-ink min-w-0">
                              <span className="font-semibold">{l.journee.jourSemaine} {jourDuMoisUTC(l.journee.date)}</span>
                              {' — '}{r.nom} ({LABEL_TAILLE[l.taille]})
                            </span>
                            <span className="font-medium text-pomme-ink/70 shrink-0">{r.prix.toFixed(2)}$</span>
                          </div>
                          {peutSignaler && !msg && (
                            <button
                              type="button"
                              disabled={absenceEnCours === cle}
                              onClick={() => signalerAbsence(c.id, l.journeeId)}
                              className="press mt-1 inline-flex min-h-[36px] items-center text-xs font-semibold text-status-critical hover:underline disabled:opacity-60"
                            >
                              {absenceEnCours === cle ? 'Envoi…' : 'Signaler une absence pour cette journée'}
                            </button>
                          )}
                          {msg && (
                            <p className={`mt-1 text-xs font-semibold ${msg.erreur ? 'text-status-critical' : 'text-status-good'}`}>
                              {msg.texte}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {commandes.length === 0 && (
            <p className="text-sm text-pomme-ink/65 bg-white rounded-2xl shadow-card p-5">Aucune commande envoyée pour le moment.</p>
          )}
        </div>
      </div>
    </div>
  );
}
