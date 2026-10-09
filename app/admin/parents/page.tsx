'use client';
// app/admin/parents/page.tsx
// Profils des comptes parents. Deux mécaniques de prépaiement, sur des
// portées différentes depuis le 17 août 2026 (Christine : « configurer par
// enfant mais que le parent reste sur un seul compte ») :
//   - Entente annuelle : forfait fixe à 6,50$/repas, PAR ENFANT (voir
//     lib/entente.ts, PATCH /api/admin/enfants/[id]) — chaque enfant a son
//     propre bassin de 180 repas, suivi en versements. Christine ne
//     renseigne QUE les versements, le solde restant se calcule seul.
//   - Solde prépayé libre : un montant avancé au choix, PAR COMPTE (partagé
//     entre tous les enfants, voir lib/solde-prepaye.ts, PATCH
//     /api/admin/parents/[id]) — débité au tarif réel de chaque commande.
//     Christine enregistre ici chaque dépôt reçu hors ligne.
import { useEffect, useState } from 'react';
import StatTile from '../dashboard/StatTile';
import { CHAMP, CHAMP_NU, classePastille } from '@/lib/ui';

// Dupliqué de lib/commandes.ts (server-only, dépend de Prisma — inutilisable
// dans ce composant client), même patron que app/parent/inscription/page.tsx.
const NIVEAUX = ['Préscolaire', '1', '2', '3', '4', '5', '6', 'Adulte'];
const INTOLERANCES = ['Gluten', 'Lactose', 'Végétarien'];
const PALIERS_DEPOT_INITIAL = [70, 140, 210, 280];

type Depot = { id: string; montant: number; motif: string | null; createdAt: string };
type Solde = { totalDepose: number; consomme: number; disponible: number; depots: Depot[] };
type EtatVersement = { montant: number; dateEcheance: string; joursRestants: number; enRetard: boolean; approche: boolean };
type EntenteEnfant = {
  montantTotal: number; montantVersement: number;
  repasInclus: number; repasUtilises: number; repasRestants: number; soldeDollars: number;
  versements: number | null; versement2: EtatVersement | null;
};
type EnfantAdmin = {
  id: string;
  prenom: string;
  nomDeFamille: string;
  prepayeAnnuel: boolean;
  ententeVersements: number | null;
  ententeDate2eVersement: string | null;
  ententeVerse2Paye: boolean;
  entente: EntenteEnfant | null;
};
type Parent = {
  id: string;
  nom: string;
  courriel: string;
  telephone: string | null;
  soldePrepayeActif: boolean;
  solde: Solde | null;
  enfants: EnfantAdmin[];
  createdAt: string;
  _count: { enfants: number; commandes: number };
};
type ModeCompte = 'AUCUN' | 'ENTENTE' | 'SOLDE';

// Paliers suggérés à l'écran — alignés sur un nombre de repas au tarif
// régulier de 7$ (10/20/30/40 repas), approuvés par Christine plutôt que
// des montants arbitraires. Dupliqué de lib/solde-prepaye.ts::PALIERS_DEPOT
// (server-only, dépend de Prisma — inutilisable dans ce composant client).
const PALIERS_DEPOT = [70, 140, 210, 280];

const MODES_COMPTE: { valeur: ModeCompte; label: string }[] = [
  { valeur: 'AUCUN', label: 'Paiement à la commande' },
  { valeur: 'ENTENTE', label: 'Entente annuelle' },
  { valeur: 'SOLDE', label: 'Solde prépayé' },
];

export default function ParentsPage() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [charge, setCharge] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [enCours, setEnCours] = useState<string | null>(null);
  const [panneauOuvert, setPanneauOuvert] = useState(false);

  const charger = () => {
    fetch('/api/admin/parents').then((r) => r.json()).then((d) => { setParents(d); setCharge(true); });
  };
  useEffect(charger, []);

  const patch = async (id: string, corps: Record<string, unknown>) => {
    setEnCours(id);
    await fetch(`/api/admin/parents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corps),
    });
    setEnCours(null);
    charger();
  };

  // Entente annuelle : par enfant (voir lib/entente.ts) — PATCH sur
  // /api/admin/enfants/[id], pas sur le compte.
  const patchEnfant = async (enfantId: string, corps: Record<string, unknown>) => {
    setEnCours(enfantId);
    await fetch(`/api/admin/enfants/${enfantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corps),
    });
    setEnCours(null);
    charger();
  };

  const filtre = recherche.trim().toLowerCase();
  const parentsAffiches = parents.filter(
    (p) => !filtre || p.nom.toLowerCase().includes(filtre) || p.courriel.toLowerCase().includes(filtre)
  );
  const prepayes = parents.reduce((n, p) => n + p.enfants.filter((e) => e.prepayeAnnuel).length, 0);
  const soldePrepayes = parents.filter((p) => p.soldePrepayeActif).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="animate-fade-in-up text-2xl font-display font-semibold text-pomme-leaf-deep">Parents</h1>
        <button
          type="button"
          onClick={() => setPanneauOuvert((v) => !v)}
          className="press bg-pomme-apple-deep text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-soft hover:bg-pomme-leaf transition-colors"
        >
          {panneauOuvert ? 'Annuler' : '+ Créer un compte parent'}
        </button>
      </div>

      {panneauOuvert && (
        <PanneauCreationParent
          onCree={() => { setPanneauOuvert(false); charger(); }}
          onAnnuler={() => setPanneauOuvert(false)}
        />
      )}

      {charge && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile label="Profils" valeur={parents.length} />
          <StatTile label="Ententes annuelles" valeur={prepayes} />
          <StatTile label="Soldes prépayés" valeur={soldePrepayes} />
          <StatTile label="Commandes envoyées" valeur={parents.reduce((n, p) => n + p._count.commandes, 0)} />
        </div>
      )}

      <input
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher par nom ou courriel…"
        className={CHAMP_NU + " w-full"}
      />

      <div className="bg-white rounded-2xl shadow-card divide-y divide-pomme-soft overflow-hidden">
        {parentsAffiches.map((p) => (
          <LigneParent
            key={p.id} p={p} enCours={enCours}
            onPatch={(corps) => patch(p.id, corps)}
            onPatchEnfant={patchEnfant}
            onDepotChange={charger}
          />
        ))}
        {charge && parentsAffiches.length === 0 && (
          <p className="p-5 text-sm text-pomme-ink/65">Aucun profil parent pour le moment.</p>
        )}
      </div>
    </div>
  );
}

// Ouverture directe d'un compte parent par Christine (courriel du 17 août
// 2026) — pour les parents qui la paient en personne (comptant, chèque) et
// « disparaissent » sans jamais créer leur propre compte. Voir POST
// /api/admin/parents : mot de passe aléatoire, courriel avec lien de
// premier accès (30 jours).
function PanneauCreationParent({ onCree, onAnnuler }: { onCree: () => void; onAnnuler: () => void }) {
  const [institutions, setInstitutions] = useState<{ id: string; nom: string }[]>([]);
  const [nom, setNom] = useState('');
  const [courriel, setCourriel] = useState('');
  const [telephone, setTelephone] = useState('');
  const [enfantPrenom, setEnfantPrenom] = useState('');
  const [enfantNomDeFamille, setEnfantNomDeFamille] = useState('');
  const [enfantNiveau, setEnfantNiveau] = useState('');
  const [enfantInstitutionId, setEnfantInstitutionId] = useState('');
  const [enfantIntolerances, setEnfantIntolerances] = useState<string[]>([]);
  const [enfantAutreIntolerance, setEnfantAutreIntolerance] = useState('');
  const [formule, setFormule] = useState<ModeCompte>('AUCUN');
  const [depotInitial, setDepotInitial] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    fetch('/api/institutions').then((r) => r.json()).then(setInstitutions);
  }, []);

  const creer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    setEnCours(true);
    const res = await fetch('/api/admin/parents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom, courriel, telephone,
        enfantPrenom, enfantNomDeFamille, enfantNiveau, enfantInstitutionId,
        enfantIntolerances, enfantAutreIntolerance,
        formule,
        depotInitial: depotInitial ? parseFloat(depotInitial) : undefined,
      }),
    });
    setEnCours(false);
    if (!res.ok) {
      const { error } = await res.json();
      setErreur(error);
      return;
    }
    onCree();
  };

  return (
    <form onSubmit={creer} className="animate-scale-in bg-white rounded-2xl shadow-card p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="text-lg font-display font-semibold text-pomme-leaf-deep">Créer un compte parent</h2>
        <p className="text-sm font-medium text-pomme-ink/65 mt-1">
          Pour un parent qui paie directement (comptant, chèque) — le compte et le mode de paiement sont actifs
          immédiatement, un courriel lui permet de choisir son mot de passe quand il le souhaite.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <label className="block text-sm font-medium text-pomme-ink/85">
          Nom du parent
          <input value={nom} onChange={(e) => setNom(e.target.value)} className={CHAMP} />
        </label>
        <label className="block text-sm font-medium text-pomme-ink/85">
          Courriel
          <input type="email" value={courriel} onChange={(e) => setCourriel(e.target.value)} className={CHAMP} />
        </label>
        <label className="block text-sm font-medium text-pomme-ink/85">
          Téléphone
          <input value={telephone} onChange={(e) => setTelephone(e.target.value)} className={CHAMP} />
        </label>
      </div>

      <div className="space-y-3 pt-3 border-t border-pomme-line/40">
        <h3 className="text-xs font-bold uppercase tracking-wide text-pomme-ink/50">L&rsquo;enfant</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block text-sm font-medium text-pomme-ink/85">
            Prénom
            <input value={enfantPrenom} onChange={(e) => setEnfantPrenom(e.target.value)} className={CHAMP} />
          </label>
          <label className="block text-sm font-medium text-pomme-ink/85">
            Nom de famille
            <input value={enfantNomDeFamille} onChange={(e) => setEnfantNomDeFamille(e.target.value)} className={CHAMP} />
          </label>
          <label className="block text-sm font-medium text-pomme-ink/85">
            École, CPE ou RPA
            <select value={enfantInstitutionId} onChange={(e) => setEnfantInstitutionId(e.target.value)} className={CHAMP}>
              <option value="">Choisir…</option>
              {institutions.map((i) => <option key={i.id} value={i.id}>{i.nom}</option>)}
            </select>
          </label>
        </div>
        <div>
          <span className="block text-sm font-medium text-pomme-ink/85 mb-2">Niveau</span>
          <div className="flex flex-wrap gap-2">
            {NIVEAUX.map((n) => (
              <button key={n} type="button" onClick={() => setEnfantNiveau(n)} className={classePastille(enfantNiveau === n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="block text-sm font-medium text-pomme-ink/85 mb-2">Intolérance / allergie</span>
          <div className="flex flex-wrap gap-2 mb-2">
            {INTOLERANCES.map((a) => (
              <button
                key={a} type="button"
                onClick={() => setEnfantIntolerances((cur) => cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a])}
                className={classePastille(enfantIntolerances.includes(a))}
              >
                {a}
              </button>
            ))}
          </div>
          <input
            value={enfantAutreIntolerance}
            onChange={(e) => setEnfantAutreIntolerance(e.target.value)}
            placeholder="Autre (préciser)"
            className={CHAMP}
          />
        </div>
      </div>

      <div className="space-y-3 pt-3 border-t border-pomme-line/40">
        <h3 className="text-xs font-bold uppercase tracking-wide text-pomme-ink/50">Mode de paiement à activer</h3>
        <div className="flex flex-wrap gap-2">
          {MODES_COMPTE.map((m) => (
            <button key={m.valeur} type="button" onClick={() => setFormule(m.valeur)} className={classePastille(formule === m.valeur)}>
              {m.label}
            </button>
          ))}
        </div>
        {formule === 'SOLDE' && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-sm font-medium text-pomme-ink/75 mr-1">Dépôt initial (optionnel) :</span>
            {PALIERS_DEPOT_INITIAL.map((palier) => (
              <button
                key={palier} type="button"
                onClick={() => setDepotInitial(String(palier))}
                className={`press px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                  depotInitial === String(palier) ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep' : 'border-pomme-line/60 text-pomme-ink/80 hover:border-pomme-apple-deep'
                }`}
              >
                {palier}$
              </button>
            ))}
            <input
              type="number" min="0" step="0.01" value={depotInitial}
              onChange={(e) => setDepotInitial(e.target.value)}
              placeholder="Autre montant"
              className="w-28 border border-pomme-line/50 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40"
            />
          </div>
        )}
      </div>

      {erreur && <p className="text-sm text-status-critical font-medium">{erreur}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit" disabled={enCours}
          className="press bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf transition-all disabled:opacity-60"
        >
          {enCours ? 'Création…' : 'Créer le compte'}
        </button>
        <button type="button" onClick={onAnnuler} className="text-sm font-semibold text-pomme-ink/65 hover:text-pomme-apple-deep">
          Annuler
        </button>
      </div>
    </form>
  );
}

// Champ de date isolé du rechargement réseau — patchEnfant() recharge toute
// la liste des parents à chaque appel, ce qui réinitialisait ce champ EN
// PLEIN MILIEU d'une frappe si on envoyait la requête sur chaque onChange
// (coquille de Christine du 17 août 2026 : « je ne peux inscrire 2027,
// seulement 0027 »). On garde donc une valeur locale et on ne sauvegarde
// qu'à la sortie du champ (onBlur).
function ChampDateVersement({ valeur, disabled, onValider }: {
  valeur: string | null; disabled: boolean; onValider: (v: string | null) => void;
}) {
  const [local, setLocal] = useState(valeur ? valeur.slice(0, 10) : '');
  useEffect(() => { setLocal(valeur ? valeur.slice(0, 10) : ''); }, [valeur]);

  return (
    <label className="flex items-center gap-1.5 font-medium text-pomme-ink/75">
      Échéance du 2<sup>e</sup>
      <input
        type="date"
        value={local}
        disabled={disabled}
        onChange={(ev) => setLocal(ev.target.value)}
        onBlur={() => { if (local !== (valeur ? valeur.slice(0, 10) : '')) onValider(local || null); }}
        className="border border-pomme-line/50 rounded-lg px-2 py-1 text-base sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40"
      />
    </label>
  );
}

function LigneParent({ p, enCours, onPatch, onPatchEnfant, onDepotChange }: {
  p: Parent; enCours: string | null;
  onPatch: (corps: Record<string, unknown>) => void;
  onPatchEnfant: (enfantId: string, corps: Record<string, unknown>) => void;
  onDepotChange: () => void;
}) {
  const [historique, setHistorique] = useState(false);
  const [montant, setMontant] = useState('');
  const [envoiDepot, setEnvoiDepot] = useState(false);

  const ajouterDepot = async (m: number) => {
    if (!Number.isFinite(m) || m <= 0) return;
    setEnvoiDepot(true);
    await fetch(`/api/admin/parents/${p.id}/depots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ montant: m }),
    });
    setEnvoiDepot(false);
    setMontant('');
    onDepotChange();
  };

  const retirerDepot = async (depotId: string) => {
    setEnvoiDepot(true);
    await fetch(`/api/admin/parents/${p.id}/depots/${depotId}`, { method: 'DELETE' });
    setEnvoiDepot(false);
    onDepotChange();
  };

  return (
    <div className="px-5 py-3.5 transition-colors duration-200 hover:bg-pomme-soft/50">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-pomme-ink truncate">{p.nom}</div>
          <div className="text-xs text-pomme-ink/65 truncate">
            {p.courriel}{p.telephone ? ` · ${p.telephone}` : ''} · {p._count.enfants} enfant{p._count.enfants > 1 ? 's' : ''} · {p._count.commandes} commande{p._count.commandes > 1 ? 's' : ''}
          </div>
        </div>
        <button
          type="button"
          disabled={enCours === p.id}
          onClick={() => onPatch({ soldePrepayeActif: !p.soldePrepayeActif })}
          className={`shrink-0 press rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all duration-200 disabled:opacity-60 ${
            p.soldePrepayeActif ? 'bg-pomme-apple-deep text-white' : 'bg-pomme-soft text-pomme-ink/70 hover:bg-pomme-soft/70'
          }`}
        >
          Solde prépayé {p.soldePrepayeActif ? '✓' : ''}
        </button>
      </div>

      {p.enfants.length > 0 && (
        <div className="mt-3 pt-3 border-t border-pomme-line/40 space-y-2.5">
          {p.enfants.map((e) => (
            <div key={e.id} className="bg-pomme-soft/40 rounded-xl px-3 py-2.5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-xs font-bold text-pomme-ink">{e.prenom} {e.nomDeFamille}</span>
                <button
                  type="button"
                  disabled={enCours === e.id}
                  onClick={() => onPatchEnfant(e.id, e.prepayeAnnuel ? { prepayeAnnuel: false } : { prepayeAnnuel: true, ententeVersements: 1 })}
                  className={`press rounded-lg px-2.5 py-1 text-xs font-bold transition-all duration-200 disabled:opacity-60 ${
                    e.prepayeAnnuel ? 'bg-status-good text-white' : 'bg-white border border-pomme-line/60 text-pomme-ink/70 hover:border-pomme-apple-deep'
                  }`}
                >
                  Entente annuelle {e.prepayeAnnuel ? '✓' : ''}
                </button>
              </div>

              {e.prepayeAnnuel && (
                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                  <label className="flex items-center gap-1.5 font-medium text-pomme-ink/75">
                    Versements
                    <select
                      value={e.ententeVersements ?? 1}
                      disabled={enCours === e.id}
                      onChange={(ev) => onPatchEnfant(e.id, { ententeVersements: Number(ev.target.value) })}
                      className="border border-pomme-line/50 rounded-lg px-2 py-1 text-base sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40"
                    >
                      <option value={1}>1 versement</option>
                      <option value={2}>2 versements</option>
                    </select>
                  </label>

                  {e.ententeVersements === 2 && (
                    <>
                      <ChampDateVersement
                        valeur={e.ententeDate2eVersement}
                        disabled={enCours === e.id}
                        onValider={(v) => onPatchEnfant(e.id, { ententeDate2eVersement: v })}
                      />
                      <button
                        type="button"
                        disabled={enCours === e.id}
                        onClick={() => onPatchEnfant(e.id, { ententeVerse2Paye: !e.ententeVerse2Paye })}
                        className={`press rounded-lg px-2.5 py-1 text-xs font-bold transition-all duration-200 disabled:opacity-60 ${
                          e.ententeVerse2Paye ? 'bg-status-good/15 text-status-good' : 'bg-status-warning/15 text-status-warning'
                        }`}
                      >
                        {e.ententeVerse2Paye ? '✓ 2e versement reçu' : '2e versement en attente'}
                      </button>
                    </>
                  )}
                  {e.entente && (
                    <span className="text-pomme-ink/60">
                      {e.entente.repasRestants} / {e.entente.repasInclus} repas restants
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {p.soldePrepayeActif && p.solde && (
        <div className="mt-3 pt-3 border-t border-pomme-line/40 space-y-2.5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
            <span className="font-bold text-pomme-apple-deep">{p.solde.disponible.toFixed(2)}$ disponible</span>
            <span className="text-pomme-ink/60">{p.solde.totalDepose.toFixed(2)}$ déposé · {p.solde.consomme.toFixed(2)}$ consommé</span>
            <button type="button" onClick={() => setHistorique((v) => !v)} className="text-pomme-apple-deep font-semibold hover:underline">
              {historique ? 'Masquer' : 'Historique'} ({p.solde.depots.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {PALIERS_DEPOT.map((palier) => (
              <button
                key={palier}
                type="button"
                disabled={envoiDepot}
                onClick={() => ajouterDepot(palier)}
                className="press px-2.5 py-1 rounded-lg text-xs font-semibold border border-pomme-line/60 text-pomme-ink/80 hover:border-pomme-apple-deep hover:text-pomme-apple-deep transition-all duration-200 disabled:opacity-60"
              >
                +{palier}$
              </button>
            ))}
            <input
              type="number" min="0" step="0.01" value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="Autre montant"
              className="w-28 border border-pomme-line/50 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40"
            />
            <button
              type="button"
              disabled={envoiDepot || !montant}
              onClick={() => ajouterDepot(parseFloat(montant))}
              className="press px-2.5 py-1 rounded-lg text-xs font-bold bg-pomme-apple-deep text-white hover:bg-pomme-leaf transition-all duration-200 disabled:opacity-60"
            >
              + Ajouter le dépôt
            </button>
          </div>

          {historique && (
            <div className="space-y-1 pt-1">
              {p.solde.depots.length === 0 && <p className="text-xs text-pomme-ink/55">Aucun dépôt enregistré.</p>}
              {p.solde.depots.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 text-xs bg-pomme-soft/40 rounded-lg px-2.5 py-1.5">
                  <span className="font-medium text-pomme-ink/80 min-w-0">
                    {d.montant.toFixed(2)}$ · {new Date(d.createdAt).toLocaleDateString('fr-CA')}
                    {d.motif && <span className="block text-pomme-ink/55 truncate">{d.motif}</span>}
                  </span>
                  <button
                    type="button" disabled={envoiDepot}
                    onClick={() => retirerDepot(d.id)}
                    className="text-status-critical hover:underline font-semibold disabled:opacity-60"
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
