'use client';
// app/menus/[institutionId]/[menuId]/FormulaireCommande.tsx
// Le coupon-réponse, mais en ligne. Un compte est OBLIGATOIRE pour
// commander (Christine, courriel du 16 août 2026 — la commande invité a
// été retirée) : un visiteur non connecté voit un choix entre se connecter
// et créer un compte, jamais un formulaire de commande direct. Une fois
// connecté, l'enfant déjà enregistré se choisit et la commande précédente
// pour ce menu se précharge et se modifie plutôt que de se dupliquer.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { jourDuMoisUTC, estJourAVenirOuAujourdhui } from '@/lib/menu-logic';
import { CHAMP } from '@/lib/ui';

type SelectionPourCommande = { id: string; nom: string; prixPetit: string; prixRegulier: string; prixDeuxiemeService: string };
type JourneePourCommande = { id: string; jourSemaine: string; date: string; selections: SelectionPourCommande[] };
// Le solde de l'entente annuelle, calculé côté serveur (voir lib/entente.ts
// et GET /api/parent/moi) — jamais recalculé ici, seulement affiché.
type Entente = { repasInclus: number; repasRestants: number; soldeDollars: number };
// Entente annuelle PAR ENFANT depuis le 17 août 2026 (voir lib/entente.ts)
// — chaque enfant porte son propre forfait, le parent reste sur un compte.
type Enfant = {
  id: string; prenom: string; nomDeFamille: string; niveau: string;
  institution: { id: string; niveauxFormatPetit: string[] };
  prepayeAnnuel: boolean; entente: Entente | null;
};
// Solde prépayé libre — voir lib/solde-prepaye.ts. Contrairement à
// l'entente, disponible peut manquer : c'est le cas normal qui déclenche
// le blocage « regarnir » plus bas. Reste au niveau du compte.
type SoldePrepaye = { totalDepose: number; consomme: number; disponible: number };
type Parent = {
  id: string; enfants: Enfant[]; soldePrepayeActif: boolean;
  modePaiementPrefere: string | null; soldePrepaye: SoldePrepaye | null;
};
type Commande = {
  enfant: { id: string };
  menu: { id: string };
  modePaiement: string;
  lignes: { journeeId: string; selectionId: string; taille: string }[];
};
type Choix = { selectionId: string; taille: string };

// Coût total des choix courants, pour la projection en direct du solde
// prépayé — duplique lib/menu-logic.ts::prixSelonTaille en pur JS parce que
// ce fichier est un composant client (pas d'accès à Prisma/server-only).
function coutChoix(choix: Record<string, Choix>, journees: JourneePourCommande[]): number {
  let total = 0;
  for (const journee of journees) {
    const c = choix[journee.id];
    if (!c) continue;
    const selection = journee.selections.find((s) => s.id === c.selectionId);
    if (!selection) continue;
    const prix = c.taille === 'PETIT' ? selection.prixPetit : c.taille === 'DEUXIEME_SERVICE' ? selection.prixDeuxiemeService : selection.prixRegulier;
    total += parseFloat(prix);
  }
  return total;
}

// Classe partagée des puces de taille — extraite pour éviter de la
// retaper trois fois (Petit / Régulier / Portion +) dans SelecteurJournees.
// C'est LE bouton du parcours : un parent qui commande dix journées le
// touche vingt fois, presque toujours au pouce. En pastille compacte il
// faisait 26 px de haut — sous le seuil de 44 px où la cible devient
// fiable au doigt. Sur mobile il prend donc toute la largeur (une rangée
// par choix, impossible de viser à côté) et retrouve sa forme compacte
// dès qu'il y a la place, à partir de sm.
function classeBoutonTaille(actif: boolean): string {
  return `press w-full sm:w-auto min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
    actif ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep shadow-soft' : 'bg-white border-pomme-line/60 text-pomme-ink/75 hover:border-pomme-apple-deep hover:text-pomme-apple-deep'
  }`;
}

// « Entente annuelle » et « Solde prépayé » ne figurent PAS ici : ce sont
// des statuts de compte que Christine configure elle-même (voir
// /admin/parents), jamais un choix qu'un parent fait à la commande — les
// laisser sélectionnables permettrait à n'importe qui de se déclarer
// prépayé et de sauter le paiement. Le serveur les dérive et les impose,
// voir POST /api/parent/commandes.
const MODES_BASE: { valeur: string; label: string }[] = [
  { valeur: 'ARGENT', label: 'Argent comptant' },
  { valeur: 'VIREMENT_INTERAC', label: 'Virement Interac' },
  { valeur: 'CHEQUE', label: 'Chèque' },
];
const MODE_FONDATION = { valeur: 'FONDATION', label: 'Fondation' };
// Idem pour "Fondation" — offert seulement par certaines institutions
// (voir Institution.offreFondation).
function modesPour(offreFondation: boolean) {
  return offreFondation ? [...MODES_BASE, MODE_FONDATION] : MODES_BASE;
}
const NIVEAUX = ['Préscolaire', '1', '2', '3', '4', '5', '6', 'Adulte'];
const INTOLERANCES = ['Gluten', 'Lactose', 'Végétarien'];
const INPUT = CHAMP;

// Mode de paiement, niveau scolaire : des pastilles côte à côte. Elles
// gardent leur forme ronde mais montent à 44 px de haut, sinon « 1 », « 2 »,
// « 3 » font 33 px de large et se ratent au doigt.
function ChoixPuce({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`press min-h-[44px] px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
        actif ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep shadow-soft scale-105' : 'bg-white border-pomme-line/60 text-pomme-ink/85 hover:border-pomme-apple-mid hover:text-pomme-apple-deep'
      }`}
    >
      {children}
    </button>
  );
}

// Barre de récapitulatif collante — ajoutée le 2026-08-12 après avoir suivi
// le parcours d'un parent au téléphone : il choisissait ses dix journées
// sans jamais voir combien de repas ni quel montant, et le bouton d'envoi
// se trouvait à 6 000 px du haut de la page. Il fallait tout faire de
// mémoire, puis dérouler à l'aveugle pour confirmer.
//
// La barre n'apparaît qu'une fois au moins une journée choisie (sinon elle
// masquerait le menu pour rien). Son bouton est le SEUL geste de suite du
// parcours multi-enfants (voir Christine, courriel du 4 septembre 2026) :
// - s'il reste un autre enfant à commander, il ENVOIE la commande de
//   l'enfant courant puis bascule automatiquement sur le suivant — jamais
//   de sélection perdue, jamais l'impression que « rien ne se passe » en
//   cliquant Continuer.
// - sur le dernier enfant (ou s'il n'y en a qu'un), c'est directement le
//   bouton d'envoi final : aucune option « Continuer » ne reste affichée
//   une fois tous les enfants traités, pour ne pas laisser croire qu'il y a
//   encore une étape après.
function BarreRecapitulatif({ nbRepas, total, label, onClick, desactive, enCours }: {
  nbRepas: number; total: number; label: string; onClick: () => void; desactive: boolean; enCours: boolean;
}) {
  if (nbRepas === 0) return null;
  return (
    <div className="sticky bottom-0 z-30 -mx-6 mt-2 border-t border-pomme-line/50 bg-white/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-pomme-ink">
            {nbRepas} repas {nbRepas > 1 ? 'choisis' : 'choisi'}
          </div>
          <div className="text-lg font-display font-semibold leading-tight text-pomme-leaf-deep">
            {total.toFixed(2).replace('.', ',')}&nbsp;$
          </div>
        </div>
        <button
          type="button"
          onClick={onClick}
          disabled={desactive}
          className="press inline-flex min-h-[44px] shrink-0 items-center rounded-xl bg-pomme-apple-deep px-5 text-sm font-bold text-white shadow-soft transition-all hover:bg-pomme-leaf hover:shadow-lifted disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {enCours ? 'Envoi…' : label}
        </button>
      </div>
    </div>
  );
}

function SelecteurJournees({ journees, choix, onChoisir, onRetirer, offreFormatPetit }: {
  journees: JourneePourCommande[]; choix: Record<string, Choix>;
  onChoisir: (journeeId: string, selectionId: string, taille: string) => void;
  onRetirer: (journeeId: string) => void;
  offreFormatPetit: boolean;
}) {
  // Portion + est un SUPPLÉMENT au repas régulier, pas un choix concurrent
  // — demandé par Christine (courriel du 10 août 2026) : « obligatoirement
  // choisir 7$ et s'ils veulent une portion +, il clique et 3$ s'ajoute ».
  // Cliquer Portion + avant d'avoir choisi le repas régulier ne fait rien
  // de silencieux : ça affiche l'avis ci-dessous, à sa demande explicite.
  const [avis, setAvis] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-pomme-ink/60">
        💡 Portion + s&rsquo;ajoute à votre repas régulier — choisissez d&rsquo;abord le repas régulier, puis ajoutez Portion + si vous le souhaitez.
      </p>
      {journees.map((j) => {
        const choixJour = choix[j.id];
        return (
          <div
            key={j.id}
            className={`rounded-xl p-3.5 border transition-all duration-300 ${
              choixJour ? 'border-pomme-apple-mid/70 bg-pomme-soft/50 shadow-soft' : 'border-pomme-line/50 hover:border-pomme-apple-light'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {choixJour && <span className="text-pomme-apple-deep text-sm">✓</span>}
              <div className="text-sm font-bold text-pomme-ink">{j.jourSemaine} {jourDuMoisUTC(j.date)}</div>
            </div>
            <div className="space-y-2.5">
              {j.selections.map((s) => {
                const cetteSelection = choixJour?.selectionId === s.id;
                const actifPetit = cetteSelection && choixJour?.taille === 'PETIT';
                const actifPortion = cetteSelection && choixJour?.taille === 'DEUXIEME_SERVICE';
                const actifRegulier = cetteSelection && (choixJour?.taille === 'REGULIER' || actifPortion);
                const prixPortion = (parseFloat(s.prixDeuxiemeService) - parseFloat(s.prixRegulier)).toFixed(2);
                const cleAvis = `${j.id}:${s.id}`;

                return (
                  <div key={s.id}>
                    <div className="text-sm font-semibold text-pomme-ink mb-1.5">{s.nom}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {offreFormatPetit && (
                        <button
                          type="button"
                          onClick={() => { setAvis(null); onChoisir(j.id, s.id, 'PETIT'); }}
                          className={classeBoutonTaille(actifPetit)}
                        >
                          Petit repas — {s.prixPetit}$
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { setAvis(null); onChoisir(j.id, s.id, 'REGULIER'); }}
                        className={classeBoutonTaille(actifRegulier)}
                      >
                        Repas régulier — {s.prixRegulier}$
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!actifRegulier) { setAvis(cleAvis); return; }
                          setAvis(null);
                          onChoisir(j.id, s.id, actifPortion ? 'REGULIER' : 'DEUXIEME_SERVICE');
                        }}
                        className={classeBoutonTaille(actifPortion)}
                      >
                        + Portion + — {prixPortion}$
                      </button>
                    </div>
                    {avis === cleAvis && (
                      <p className="text-xs font-semibold text-pomme-blush-deep mt-1.5">
                        Choisissez d&rsquo;abord Repas régulier, puis ajoutez Portion +.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {choixJour && (
              <button type="button" onClick={() => { setAvis(null); onRetirer(j.id); }} className="press inline-flex items-center min-h-[44px] -ml-1 px-1 mt-1 text-sm font-medium text-status-critical hover:underline">
                Retirer cette journée
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SelecteurPaiement({ valeur, onChange, offreFondation }: { valeur: string; onChange: (v: string) => void; offreFondation: boolean }) {
  const MODES = modesPour(offreFondation);
  return (
    <div>
      <span className="block text-sm font-semibold text-pomme-ink mb-2">Mode de paiement</span>
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <ChoixPuce key={m.valeur} actif={valeur === m.valeur} onClick={() => onChange(m.valeur)}>{m.label}</ChoixPuce>
        ))}
      </div>
    </div>
  );
}

// Met en valeur les deux façons de prépayer — demandé par Christine
// (courriels des 10-11 août 2026) pour qu'un parent qui ne les connaît pas
// déjà en découvre l'existence directement en commandant, plutôt que par
// un courriel séparé. Deux options bien distinctes dans UN SEUL bloc
// (plutôt que deux bannières) pour rester lisible : l'entente annuelle est
// le forfait complet à taux fixe, le solde prépayé est une avance libre au
// tarif régulier — voir lib/entente.ts et lib/solde-prepaye.ts.
// N'apparaît jamais à un parent déjà sur l'une des deux mécaniques.
//
// Fusion demande+compte (Christine, courriel du 14 août 2026) : plus de
// formulaire séparé à remplir.
//   - Visiteur sans compte : le bouton mène directement à la création de
//     compte (voir /parent/inscription), qui porte maintenant sa propre
//     étape "comment voulez-vous payer".
//   - Parent déjà connecté : tout est déjà connu (nom, courriel, enfant),
//     un clic suffit — voir POST /api/parent/moi/demande-prepaye.
function BlocPrepaye({ institutionId, connecte }: { institutionId: string; connecte: boolean }) {
  const [envoiEnCours, setEnvoiEnCours] = useState<'ENTENTE' | 'SOLDE' | null>(null);
  const [confirme, setConfirme] = useState<'ENTENTE' | 'SOLDE' | null>(null);

  // Le splash de la liste des écoles pointe #prepaye, mais ce bloc n'existe
  // pas encore dans le DOM au chargement de la page (le formulaire attend
  // /api/parent/moi) — le navigateur ne trouve donc rien à cibler. On refait
  // le défilement nous-mêmes une fois le bloc réellement affiché.
  const ancre = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.location.hash === '#prepaye') {
      ancre.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const demanderConnecte = async (formule: 'ENTENTE' | 'SOLDE') => {
    setEnvoiEnCours(formule);
    const res = await fetch('/api/parent/moi/demande-prepaye', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ institutionId, formule }),
    });
    setEnvoiEnCours(null);
    if (res.ok) setConfirme(formule);
  };

  const Action = ({ formule, label }: { formule: 'ENTENTE' | 'SOLDE'; label: string }) => {
    if (confirme === formule) {
      return <p className="text-sm font-bold text-status-good mt-1">✓ Demande envoyée — nous communiquerons avec vous sous peu.</p>;
    }
    if (connecte) {
      return (
        <button
          type="button"
          disabled={envoiEnCours !== null}
          onClick={() => demanderConnecte(formule)}
          className="press inline-flex items-center min-h-[44px] -ml-1 px-1 mt-1 text-sm font-bold text-pomme-apple-deep hover:underline disabled:opacity-60"
        >
          {envoiEnCours === formule ? 'Envoi…' : `${label} →`}
        </button>
      );
    }
    return (
      <Link
        href={`/parent/inscription?institutionId=${institutionId}&formule=${formule}`}
        className="press inline-flex items-center min-h-[44px] -ml-1 px-1 mt-1 text-sm font-bold text-pomme-apple-deep hover:underline"
      >
        {label} →
      </Link>
    );
  };

  return (
    // L'ancre #prepaye est la cible du splash placé sur la liste des écoles
    // (voir app/menus/page.tsx) — un parent qui clique « En savoir plus »
    // atterrit directement ici, en bas du formulaire de commande.
    <div id="prepaye" ref={ancre} className="scroll-mt-6 rounded-2xl border-2 border-dashed border-pomme-apple-mid/50 bg-pomme-soft/40 p-4 sm:p-5">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl shrink-0">🍏</span>
        <div className="text-sm font-bold text-pomme-leaf-deep">Simplifiez vos paiements</div>
      </div>
      <div className="bg-white/60 rounded-xl p-3.5">
        <div className="text-sm font-bold text-pomme-ink">Solde à votre rythme</div>
        <p className="text-xs font-medium text-pomme-ink/75 mt-1">
          Déposez un montant à l&rsquo;avance (70&nbsp;$, 140&nbsp;$, 210&nbsp;$…) — il se débite à chaque commande,
          au tarif régulier. Rechargez quand vous le souhaitez.
        </p>
        <Action formule="SOLDE" label={connecte ? 'Faire une demande' : 'Créer mon compte'} />
      </div>
    </div>
  );
}

// Commande tardive (dépannage) — une fois les commandes régulières
// fermées, un parent peut encore réserver un repas pour n'importe quelle
// journée à venir de cette semaine de service, au tarif dépannage FIXE de
// l'institution — jamais le tarif du menu du jour. Repas au choix du chef :
// aucune sélection de plat, seulement le jour (Christine, courriels des
// 8-9 septembre 2026 : « chaque jour au tarif dépannage »). Les enfants en
// entente annuelle en profitent sans frais additionnel — la journée est
// simplement comptée dans leur forfait, comme une commande normale ; tous
// les autres paient le tarif dépannage, solde prépayé inclus (au tarif
// dépannage plutôt qu'au tarif régulier — pas de rabais ici).
function CommandeTardive({
  menuId, enfantId, journeesEligibles, prixRepasDepannage, offreFondation,
  estPrepayeAnnuel, soldePrepayeActif, modePaiementPrefere,
}: {
  menuId: string; enfantId: string; journeesEligibles: JourneePourCommande[]; prixRepasDepannage: string;
  offreFondation: boolean; estPrepayeAnnuel: boolean; soldePrepayeActif: boolean; modePaiementPrefere: string | null;
}) {
  const [joursChoisis, setJoursChoisis] = useState<Record<string, boolean>>({});
  const [modePaiement, setModePaiement] = useState(modePaiementPrefere ?? 'VIREMENT_INTERAC');
  const [memoOuvert, setMemoOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState(false);

  const prix = parseFloat(prixRepasDepannage);
  const nbChoisis = Object.values(joursChoisis).filter(Boolean).length;
  const total = nbChoisis * prix;
  const fmtPrix = (n: number) => n.toFixed(2).replace('.', ',');

  const basculer = (journeeId: string) => {
    setSucces(false);
    setJoursChoisis((cur) => ({ ...cur, [journeeId]: !cur[journeeId] }));
  };

  const envoyer = async () => {
    const journeeIds = Object.entries(joursChoisis).filter(([, choisi]) => choisi).map(([id]) => id);
    if (journeeIds.length === 0) { setErreur('Choisissez au moins une journée.'); return; }
    setErreur('');
    setEnCours(true);
    const res = await fetch('/api/parent/commandes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enfantId, menuId, tardive: true, journeeIds, modePaiement }),
    });
    setEnCours(false);
    if (!res.ok) { setErreur((await res.json()).error); return; }
    setSucces(true);
    setJoursChoisis({});
  };

  return (
    <div className="animate-fade-in-up bg-white rounded-2xl shadow-card p-6 space-y-4">
      <div className="text-center space-y-1">
        <p className="text-lg font-display font-semibold text-pomme-leaf-deep">Commandes fermées pour ce menu</p>
        <p className="text-sm font-medium text-pomme-ink/70">
          La date limite de commande est passée — vous pouvez toujours consulter et télécharger le menu en PDF ci-dessus.
        </p>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-pomme-apple-mid/50 bg-pomme-soft/40 p-4 sm:p-5 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-pomme-ink">🍎 Commande tardive (dépannage)</p>
            <p className="text-xs font-medium text-pomme-ink/70 mt-0.5">
              Encore possible pour les journées à venir, au tarif dépannage de {fmtPrix(prix)}&nbsp;$/jour.
            </p>
          </div>
          <button
            type="button" onClick={() => setMemoOuvert(true)}
            className="press shrink-0 min-h-[36px] px-3 rounded-full text-xs font-bold border border-pomme-apple-deep text-pomme-apple-deep hover:bg-pomme-apple-deep hover:text-white transition-colors"
          >
            ⓘ En savoir plus
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {journeesEligibles.map((j) => (
            <ChoixPuce key={j.id} actif={!!joursChoisis[j.id]} onClick={() => basculer(j.id)}>
              {j.jourSemaine} {jourDuMoisUTC(j.date)} — {fmtPrix(prix)}$
            </ChoixPuce>
          ))}
        </div>

        {estPrepayeAnnuel ? (
          <p className="text-sm font-medium text-pomme-ink/65 bg-pomme-apple-light/20 rounded-xl px-3.5 py-2.5">
            Entente annuelle — aucun paiement requis, compté dans votre forfait comme une commande normale.
          </p>
        ) : (
          <>
            <SelecteurPaiement valeur={modePaiement} onChange={(v) => { setSucces(false); setModePaiement(v); }} offreFondation={offreFondation} />
            {soldePrepayeActif && (
              <p className="text-xs font-medium text-pomme-ink/60">
                Votre solde prépayé peut aussi couvrir cette commande, au tarif dépannage plutôt qu'au tarif régulier.
              </p>
            )}
          </>
        )}

        {erreur && <p className="animate-fade-in-up text-sm text-status-critical font-medium">{erreur}</p>}
        {succes && (
          <p className="animate-scale-in text-sm text-status-good font-bold bg-status-good/10 rounded-xl px-3.5 py-2.5 text-center">
            ✓ Commande tardive envoyée — merci !
          </p>
        )}

        <button
          type="button" onClick={envoyer} disabled={enCours || nbChoisis === 0}
          className="press w-full sm:w-auto min-h-[44px] bg-pomme-apple-deep text-white rounded-xl px-5 text-sm font-bold shadow-soft hover:bg-pomme-leaf hover:shadow-lifted transition-all disabled:opacity-60"
        >
          {enCours ? 'Envoi…' : nbChoisis > 0 ? `Envoyer — ${fmtPrix(total)}$` : 'Envoyer'}
        </button>
      </div>

      {memoOuvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setMemoOuvert(false)}>
          <div className="bg-white rounded-2xl shadow-lifted p-6 max-w-md w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-display font-semibold text-pomme-leaf-deep">Commande tardive</p>
            <p className="text-sm font-medium text-pomme-ink/75">
              Une fois la date limite habituelle passée, vous pouvez encore réserver un repas pour les journées qui
              restent cette semaine — au tarif dépannage de {fmtPrix(prix)}&nbsp;$ par jour plutôt que le tarif
              régulier. Le repas est au choix du chef : aucune sélection de menu n&rsquo;est possible pour ces
              journées.
            </p>
            <p className="text-sm font-medium text-pomme-ink/75">
              Les enfants en entente annuelle en profitent sans frais additionnel — la journée est simplement
              comptée dans le forfait, comme une commande normale.
            </p>
            <button
              type="button" onClick={() => setMemoOuvert(false)}
              className="press w-full min-h-[44px] bg-pomme-apple-deep text-white rounded-xl px-4 text-sm font-bold shadow-soft hover:bg-pomme-leaf transition-all"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FormulaireCommande({ institutionId, institutionNom, menuId, journees, commandesOuvertes, prixRepasDepannage, offreFondation, offreFormatPetit, institutionCourriel }: {
  institutionId: string; institutionNom: string; menuId: string; journees: JourneePourCommande[];
  commandesOuvertes: boolean; prixRepasDepannage: string | null; offreFondation: boolean; offreFormatPetit: boolean; institutionCourriel: string | null;
}) {
  const pathname = usePathname();
  const [parent, setParent] = useState<Parent | null | undefined>(undefined);

  useEffect(() => {
    fetch('/api/parent/moi')
      .then((r) => (r.status === 401 ? null : r.json()))
      .then((p: Parent | null) => setParent(p));
  }, [institutionId]);

  if (parent === undefined) return null;

  const suite = encodeURIComponent(pathname);

  if (parent === null) {
    return (
      <div className="animate-fade-in-up space-y-5">
        <div className="text-center space-y-1.5">
          <h2 className="text-xl font-display font-semibold text-pomme-leaf-deep">Un compte est nécessaire pour commander</h2>
          <p className="text-sm font-medium text-pomme-ink/65">Ça ne prend qu'une minute, et tout se souvient pour la prochaine fois — voyez lequel des deux vous convient.</p>
        </div>

        <BlocPrepaye institutionId={institutionId} connecte={false} />

        <div className="grid sm:grid-cols-2 gap-4 items-start">
          <div className="bg-white rounded-2xl shadow-card p-5 text-center space-y-3 flex flex-col">
            <div className="text-2xl">🔑</div>
            <h3 className="font-bold text-pomme-ink">Se connecter</h3>
            <p className="text-xs font-medium text-pomme-ink/65 flex-1">Vous avez déjà un compte ? Vos enfants et vos préférences sont prêts.</p>
            <Link href={`/parent/connexion?suite=${suite}`} className="press bg-white border border-pomme-line/60 text-pomme-ink rounded-xl px-4 py-2.5 text-sm font-semibold hover:border-pomme-apple-deep hover:text-pomme-apple-deep transition-colors">
              Se connecter
            </Link>
          </div>

          <div className="relative bg-white rounded-2xl shadow-glow ring-2 ring-pomme-apple-deep p-5 pt-6 text-center space-y-3 flex flex-col sm:scale-105">
            <div className="text-2xl">🌟</div>
            <h3 className="font-bold text-pomme-ink">Créer un compte</h3>
            <p className="text-xs font-medium text-pomme-ink/65">Gratuit — et ça change la vie aux deux semaines :</p>
            <ul className="text-xs font-medium text-pomme-ink/80 text-left space-y-1.5 flex-1">
              <li className="flex gap-1.5"><span>⚡</span><span>Commande en quelques secondes — tout est déjà rempli</span></li>
              <li className="flex gap-1.5"><span>🧾</span><span>Historique complet de vos commandes et paiements</span></li>
              <li className="flex gap-1.5"><span>👧</span><span>Tous vos enfants enregistrés une seule fois</span></li>
              <li className="flex gap-1.5"><span>💳</span><span>Votre mode de paiement préféré, mémorisé</span></li>
            </ul>
            <Link href={`/parent/inscription?suite=${suite}&institutionId=${institutionId}`} className="press bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf hover:shadow-lifted transition-all">
              Créer mon compte gratuit
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FormulaireConnecte
      parent={parent} institutionId={institutionId} institutionNom={institutionNom} menuId={menuId} journees={journees}
      commandesOuvertes={commandesOuvertes} prixRepasDepannage={prixRepasDepannage}
      offreFondation={offreFondation} offreFormatPetit={offreFormatPetit} institutionCourriel={institutionCourriel}
    />
  );
}

function FormulaireConnecte({ parent, institutionId, institutionNom, menuId, journees, commandesOuvertes, prixRepasDepannage, offreFondation, offreFormatPetit, institutionCourriel }: {
  parent: Parent; institutionId: string; institutionNom: string; menuId: string; journees: JourneePourCommande[];
  commandesOuvertes: boolean; prixRepasDepannage: string | null; offreFondation: boolean; offreFormatPetit: boolean; institutionCourriel: string | null;
}) {
  const enfantsEligibles = parent.enfants.filter((e) => e.institution.id === institutionId);
  const [enfantId, setEnfantId] = useState(enfantsEligibles[0]?.id ?? '');
  // Entente annuelle PAR ENFANT (voir lib/entente.ts) — l'enfant choisi
  // ci-dessous détermine si CETTE commande saute le paiement, pas le compte.
  const enfantSelectionne = enfantsEligibles.find((e) => e.id === enfantId);
  // Format « Petit repas » — certaines écoles le réservent à un
  // sous-ensemble de niveaux (ex. Jardin-des-Lacs, Notre-Dame-de-Liesse :
  // maternelle seulement — Christine, courriels du 22 et 24 août 2026).
  // Vide = tous les niveaux admissibles quand l'école l'offre.
  const niveauxFormatPetit = enfantSelectionne?.institution.niveauxFormatPetit ?? [];
  const offreFormatPetitPourEnfant = offreFormatPetit && (
    niveauxFormatPetit.length === 0 || (!!enfantSelectionne && niveauxFormatPetit.includes(enfantSelectionne.niveau))
  );
  const [choix, setChoix] = useState<Record<string, Choix>>({});
  const [modePaiement, setModePaiement] = useState(parent.modePaiementPrefere ?? 'VIREMENT_INTERAC');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState(false);
  // Nombre de journées déjà commandées AVANT toute modification cette
  // visite-ci — sert à projeter le solde de l'entente annuelle pendant que
  // le parent choisit (voir plus bas) sans compter deux fois les journées
  // qu'il avait déjà réservées pour ce menu.
  const [lignesInitiales, setLignesInitiales] = useState(0);
  // Même idée pour le solde prépayé libre, mais en dollars plutôt qu'en
  // nombre de repas (tarif réel, pas un taux fixe) — le coût déjà couvert
  // par la commande existante avant modification cette visite-ci.
  const [coutInitial, setCoutInitial] = useState(0);

  useEffect(() => {
    if (!enfantId) return;
    fetch('/api/parent/commandes')
      .then((r) => r.json())
      .then((commandes: Commande[]) => {
        const existante = commandes.find((c) => c.enfant.id === enfantId && c.menu.id === menuId);
        if (existante) {
          setModePaiement(existante.modePaiement);
          const initial: Record<string, Choix> = {};
          for (const l of existante.lignes) initial[l.journeeId] = { selectionId: l.selectionId, taille: l.taille };
          setChoix(initial);
          setLignesInitiales(existante.lignes.length);
          setCoutInitial(coutChoix(initial, journees));
        } else {
          setChoix({});
          setLignesInitiales(0);
          setCoutInitial(0);
          setModePaiement(parent.modePaiementPrefere ?? 'VIREMENT_INTERAC');
        }
      });
  }, [enfantId, menuId, parent.modePaiementPrefere]);

  if (enfantsEligibles.length === 0) {
    return (
      <div className="animate-fade-in-up bg-white rounded-2xl shadow-card p-6 text-center space-y-3">
        <p className="text-sm font-semibold text-pomme-ink">Ajoutez d&rsquo;abord votre enfant pour commander.</p>
        <Link href="/parent/compte" className="press inline-block bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf hover:shadow-lifted transition-all">
          Ajouter un enfant
        </Link>
      </div>
    );
  }

  // Le menu reste visible (page + PDF) bien après la date limite — voir
  // estMenuVisible dans lib/menu-logic.ts — mais le formulaire de
  // sélection n'a plus lieu d'être une fois les commandes closes : plutôt
  // que de laisser un parent remplir dix journées pour se heurter à
  // l'erreur serveur seulement au moment d'envoyer, on l'avertit d'emblée
  // (Christine, 8 septembre 2026).
  if (!commandesOuvertes) {
    const journeesEligibles = journees.filter((j) => estJourAVenirOuAujourdhui(j.date));
    return (
      <div className="space-y-3">
        {/* Le sélecteur d'enfant reste disponible même commandes fermées —
            un parent avec plusieurs enfants à cette institution doit
            pouvoir choisir POUR LEQUEL il passe une commande tardive. */}
        {enfantsEligibles.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {enfantsEligibles.map((e) => (
              <ChoixPuce key={e.id} actif={enfantId === e.id} onClick={() => setEnfantId(e.id)}>
                {e.prenom} {e.nomDeFamille}
              </ChoixPuce>
            ))}
          </div>
        )}
        {prixRepasDepannage && journeesEligibles.length > 0 ? (
          <CommandeTardive
            key={enfantId}
            menuId={menuId}
            enfantId={enfantId}
            journeesEligibles={journeesEligibles}
            prixRepasDepannage={prixRepasDepannage}
            offreFondation={offreFondation}
            estPrepayeAnnuel={!!enfantSelectionne?.prepayeAnnuel}
            soldePrepayeActif={parent.soldePrepayeActif}
            modePaiementPrefere={parent.modePaiementPrefere}
          />
        ) : (
          <div className="animate-fade-in-up bg-white rounded-2xl shadow-card p-6 text-center space-y-2">
            <p className="text-lg font-display font-semibold text-pomme-leaf-deep">Commandes fermées pour ce menu</p>
            <p className="text-sm font-medium text-pomme-ink/70">
              La date limite de commande est passée — vous pouvez toujours consulter et télécharger le menu en PDF ci-dessus.
            </p>
          </div>
        )}
      </div>
    );
  }

  const choisir = (journeeId: string, selectionId: string, taille: string) => {
    setSucces(false);
    setChoix((cur) => ({ ...cur, [journeeId]: { selectionId, taille } }));
  };
  const retirerJournee = (journeeId: string) => {
    setSucces(false);
    setChoix((cur) => { const suivant = { ...cur }; delete suivant[journeeId]; return suivant; });
  };

  // Retourne true/false plutôt que rien : continuerOuEnvoyer() plus bas a
  // besoin de savoir si l'envoi a réussi avant de décider de basculer sur
  // l'enfant suivant — jamais d'avancement après un échec, la sélection
  // reste visible pour correction.
  const envoyer = async (): Promise<boolean> => {
    setErreur('');
    const lignes = Object.entries(choix).map(([journeeId, c]) => ({ journeeId, selectionId: c.selectionId, taille: c.taille }));
    if (lignes.length === 0) { setErreur('Choisissez au moins une journée.'); return false; }
    setEnCours(true);
    const res = await fetch('/api/parent/commandes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Le serveur retranche l'entente/le solde prépayé et ne retombe sur ce
      // modePaiement que si l'un des deux ne couvre pas la commande — voir
      // app/api/parent/commandes/route.ts, jamais décidé ici.
      body: JSON.stringify({ enfantId, menuId, modePaiement, lignes }),
    });
    setEnCours(false);
    if (!res.ok) { setErreur((await res.json()).error); return false; }
    setSucces(true);
    return true;
  };

  // Projection en direct du solde prépayé libre — le coût des choix
  // courants moins ce que la commande consommait déjà avant modification
  // (coutInitial), comparé au solde réellement disponible pour CE menu
  // (voir lib/solde-prepaye.ts::budgetDisponiblePour, répliqué ici en pur
  // JS). Négatif = Christine n'a pas assez reçu pour couvrir ce choix, le
  // parent doit regarnir avant de pouvoir envoyer — voir bouton plus bas.
  const coutActuel = coutChoix(choix, journees);
  const soldeDisponibleApres = parent.soldePrepaye ? parent.soldePrepaye.disponible + coutInitial - coutActuel : null;
  const soldeInsuffisant = parent.soldePrepayeActif && soldeDisponibleApres !== null && soldeDisponibleApres < 0;

  const nbRepas = Object.keys(choix).length;

  // L'enfant qui suit l'enfant courant dans la liste des puces ci-dessus —
  // null s'il n'y en a pas (dernier enfant, ou un seul enfant au total).
  // Détermine si le bouton d'envoi doit ENCHAÎNER sur le suivant ou s'il
  // s'agit du dernier geste du parcours.
  const enfantSuivant = (() => {
    const i = enfantsEligibles.findIndex((e) => e.id === enfantId);
    return i >= 0 && i < enfantsEligibles.length - 1 ? enfantsEligibles[i + 1] : null;
  })();

  // Envoie la commande de l'enfant courant puis, si elle réussit et qu'il
  // reste un enfant à faire, bascule dessus automatiquement — laisse le
  // message de succès s'afficher un court instant pour que le parent VOIE
  // que quelque chose s'est passé, plutôt que de basculer instantanément
  // (voir Christine, courriel du 4 septembre 2026 : « ils ont l'impression
  // qui ce passe rien »).
  const continuerOuEnvoyer = async () => {
    const ok = await envoyer();
    if (ok && enfantSuivant) {
      setTimeout(() => {
        setEnfantId(enfantSuivant.id);
        setSucces(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 900);
    }
  };

  const libelleEnvoi = enfantSuivant ? `Envoyer et continuer vers ${enfantSuivant.prenom} →` : 'Envoyer ma commande';

  return (
    <div className="animate-fade-in-up bg-white rounded-2xl shadow-glow p-6 space-y-5">
      <h2 className="text-xl font-display font-semibold text-pomme-leaf-deep">Commander</h2>

      {enfantsEligibles.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {enfantsEligibles.map((e) => (
            <ChoixPuce key={e.id} actif={enfantId === e.id} onClick={() => { setEnfantId(e.id); setSucces(false); }}>
              {e.prenom} {e.nomDeFamille}
            </ChoixPuce>
          ))}
        </div>
      )}

      <SelecteurJournees journees={journees} choix={choix} onChoisir={choisir} onRetirer={retirerJournee} offreFormatPetit={offreFormatPetitPourEnfant} />
      <BarreRecapitulatif
        nbRepas={nbRepas}
        total={coutActuel}
        label={libelleEnvoi}
        onClick={continuerOuEnvoyer}
        desactive={enCours}
        enCours={enCours}
      />
      {enfantSelectionne?.prepayeAnnuel && enfantSelectionne.entente ? (
        (() => {
          const entente = enfantSelectionne.entente!;
          // Projection en direct : le solde actuel moins les journées
          // ajoutées cette visite-ci, plus celles déjà comptées qu'on
          // retire — jamais double-compté pour un menu déjà commandé.
          const projection = Math.max(0, entente.repasRestants - (Object.keys(choix).length - lignesInitiales));
          // 6,5 = TARIF_ENTENTE (lib/entente.ts) — dupliqué ici parce que ce
          // fichier est un composant client et ne peut pas importer lib/entente.ts
          // (dépend de Prisma, server-only).
          const soldeProjete = projection * 6.5;
          const pct = (projection / entente.repasInclus) * 100;
          return (
            <div className="bg-pomme-apple-light/20 rounded-xl px-4 py-3.5 space-y-2">
              <p className="text-sm font-bold text-pomme-leaf-deep">
                Entente annuelle — aucun paiement requis pour cette commande.
              </p>
              <div className="flex items-baseline justify-between text-xs font-semibold text-pomme-ink/70">
                <span>{projection} repas restants après cette commande</span>
                <span>{soldeProjete.toFixed(2)}$</span>
              </div>
              <div className="h-2 rounded-full bg-white overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${pct <= 15 ? 'bg-status-warning' : 'bg-pomme-apple-deep'}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          );
        })()
      ) : enfantSelectionne?.prepayeAnnuel ? (
        <p className="text-sm font-medium text-pomme-ink/65 bg-pomme-apple-light/20 rounded-xl px-3.5 py-2.5">
          Entente annuelle — aucun paiement requis pour cette commande.
        </p>
      ) : parent.soldePrepayeActif && parent.soldePrepaye ? (
        (() => {
          const pct = parent.soldePrepaye.totalDepose > 0
            ? (Math.max(0, soldeDisponibleApres ?? 0) / parent.soldePrepaye.totalDepose) * 100
            : 0;
          return (
            <>
              <div className={`rounded-xl px-4 py-3.5 space-y-2 transition-colors duration-300 ${soldeInsuffisant ? 'bg-status-warning/10' : 'bg-pomme-apple-light/20'}`}>
                <p className={`text-sm font-bold ${soldeInsuffisant ? 'text-status-warning' : 'text-pomme-leaf-deep'}`}>
                  {soldeInsuffisant ? 'Solde prépayé insuffisant — le reste de cette commande sera payable par le mode choisi ci-dessous.' : 'Solde prépayé — aucun paiement requis pour cette commande.'}
                </p>
                <div className="flex items-baseline justify-between text-xs font-semibold text-pomme-ink/70">
                  <span>{coutActuel.toFixed(2)}$ pour cette commande</span>
                  <span className={soldeInsuffisant ? 'text-status-warning font-bold' : ''}>
                    {Math.abs(soldeDisponibleApres ?? 0).toFixed(2)}$ {soldeInsuffisant ? 'manquant, payable autrement' : 'restant après'}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${soldeInsuffisant ? 'bg-status-warning' : pct <= 15 ? 'bg-status-warning' : 'bg-pomme-apple-deep'}`}
                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                  />
                </div>
              </div>
              {soldeInsuffisant && (
                <SelecteurPaiement valeur={modePaiement} onChange={(v) => { setSucces(false); setModePaiement(v); }} offreFondation={offreFondation} />
              )}
            </>
          );
        })()
      ) : (
        <>
          <SelecteurPaiement valeur={modePaiement} onChange={(v) => { setSucces(false); setModePaiement(v); }} offreFondation={offreFondation} />
          <BlocPrepaye institutionId={institutionId} connecte={true} />
        </>
      )}

      {erreur && <p className="animate-fade-in-up text-sm text-status-critical font-medium">{erreur}</p>}
      {succes && (
        <p className="animate-scale-in text-sm text-status-good font-bold bg-status-good/10 rounded-xl px-4 py-3 text-center">
          {enfantSuivant ? `✓ Commande envoyée — on passe à ${enfantSuivant.prenom}…` : '✓ Commande envoyée — merci !'}
        </p>
      )}

      <button
        onClick={continuerOuEnvoyer} disabled={enCours}
        className="press w-full bg-pomme-apple-deep text-white rounded-xl px-4 py-3.5 text-sm font-bold shadow-soft hover:bg-pomme-leaf hover:shadow-lifted hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {enCours ? 'Envoi…' : libelleEnvoi}
      </button>
    </div>
  );
}

