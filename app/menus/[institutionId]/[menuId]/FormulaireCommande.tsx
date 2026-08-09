'use client';
// app/menus/[institutionId]/[menuId]/FormulaireCommande.tsx
// Le coupon-réponse, mais en ligne — deux chemins :
// (1) parent connecté : choisit un enfant déjà enregistré (voir
//     /parent/compte), la commande précédente pour ce menu se
//     précharge et se modifie plutôt que de se dupliquer.
// (2) invité : aucun compte requis, le formulaire complet (élève +
//     parent) est rempli en même temps que le choix des repas — voir
//     POST /api/parent/commandes-invite.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { jourDuMoisUTC } from '@/lib/menu-logic';

type SelectionPourCommande = { id: string; nom: string; prixPetit: string; prixRegulier: string; prixDeuxiemeService: string };
type JourneePourCommande = { id: string; jourSemaine: string; date: string; selections: SelectionPourCommande[] };
type Enfant = { id: string; prenom: string; nomDeFamille: string; institution: { id: string } };
type Parent = { id: string; enfants: Enfant[]; prepayeAnnuel: boolean; modePaiementPrefere: string | null };
type Commande = {
  enfant: { id: string };
  menu: { id: string };
  modePaiement: string;
  lignes: { journeeId: string; selectionId: string; taille: string }[];
};
type Choix = { selectionId: string; taille: string };

const TAILLE_PETIT = { valeur: 'PETIT', label: 'Petit repas', champPrix: 'prixPetit' as const };
const TAILLES_BASE: { valeur: string; label: string; champPrix: keyof SelectionPourCommande }[] = [
  { valeur: 'REGULIER', label: 'Repas régulier', champPrix: 'prixRegulier' },
  { valeur: 'DEUXIEME_SERVICE', label: 'Repas + 2ᵉ service', champPrix: 'prixDeuxiemeService' },
];
// Le format "Petit repas" n'existe que dans certaines institutions
// (voir Institution.offreFormatPetit) — jamais affiché sinon, pour ne
// pas laisser un parent choisir un format que son école ne facture pas.
function taillesPour(offreFormatPetit: boolean) {
  return offreFormatPetit ? [TAILLE_PETIT, ...TAILLES_BASE] : TAILLES_BASE;
}

const MODES_BASE: { valeur: string; label: string }[] = [
  { valeur: 'ARGENT', label: 'Argent comptant' },
  { valeur: 'VIREMENT_INTERAC', label: 'Virement Interac' },
  { valeur: 'CHEQUE', label: 'Chèque' },
  { valeur: 'PREPAYE', label: 'Prépayé' },
];
const MODE_FONDATION = { valeur: 'FONDATION', label: 'Fondation' };
// Idem pour "Fondation" — offert seulement par certaines institutions
// (voir Institution.offreFondation).
function modesPour(offreFondation: boolean) {
  return offreFondation ? [...MODES_BASE, MODE_FONDATION] : MODES_BASE;
}
const NIVEAUX = ['Préscolaire', '1', '2', '3', '4', '5', '6', 'Adulte'];
const INTOLERANCES = ['Gluten', 'Lactose', 'Végétarien'];
const INPUT = 'w-full border border-pomme-line/50 rounded-xl px-3.5 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40 focus:border-pomme-apple-deep transition-shadow';

function ChoixPuce({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`press px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
        actif ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep shadow-soft scale-105' : 'bg-white border-pomme-line/60 text-pomme-ink/85 hover:border-pomme-apple-mid hover:text-pomme-apple-deep'
      }`}
    >
      {children}
    </button>
  );
}

function SelecteurJournees({ journees, choix, onChoisir, onRetirer, offreFormatPetit }: {
  journees: JourneePourCommande[]; choix: Record<string, Choix>;
  onChoisir: (journeeId: string, selectionId: string, taille: string) => void;
  onRetirer: (journeeId: string) => void;
  offreFormatPetit: boolean;
}) {
  const TAILLES = taillesPour(offreFormatPetit);
  return (
    <div className="space-y-3">
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
              {j.selections.map((s) => (
                <div key={s.id}>
                  <div className="text-sm font-semibold text-pomme-ink mb-1.5">{s.nom}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {TAILLES.map((t) => {
                      const actif = choixJour?.selectionId === s.id && choixJour?.taille === t.valeur;
                      return (
                        <button
                          key={t.valeur} type="button"
                          onClick={() => onChoisir(j.id, s.id, t.valeur)}
                          className={`press px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-200 ${
                            actif ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep shadow-soft' : 'bg-white border-pomme-line/60 text-pomme-ink/75 hover:border-pomme-apple-deep hover:text-pomme-apple-deep'
                          }`}
                        >
                          {t.label} — {s[t.champPrix]}$
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {choixJour && (
              <button type="button" onClick={() => onRetirer(j.id)} className="text-xs font-medium text-status-critical hover:underline mt-2">
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

export default function FormulaireCommande({ institutionId, menuId, journees, offreFondation, offreFormatPetit }: {
  institutionId: string; menuId: string; journees: JourneePourCommande[];
  offreFondation: boolean; offreFormatPetit: boolean;
}) {
  const pathname = usePathname();
  const [parent, setParent] = useState<Parent | null | undefined>(undefined);
  const [modeInvite, setModeInvite] = useState(false);

  useEffect(() => {
    fetch('/api/parent/moi')
      .then((r) => (r.status === 401 ? null : r.json()))
      .then((p: Parent | null) => setParent(p));
  }, [institutionId]);

  if (parent === undefined) return null;

  const suite = encodeURIComponent(pathname);

  if (modeInvite) {
    return (
      <FormulaireInvite
        menuId={menuId} journees={journees} onAnnuler={() => setModeInvite(false)}
        offreFondation={offreFondation} offreFormatPetit={offreFormatPetit}
      />
    );
  }

  if (parent === null) {
    return (
      <div className="animate-fade-in-up space-y-5">
        <div className="text-center space-y-1.5">
          <h2 className="text-xl font-display font-semibold text-pomme-leaf-deep">Comment voulez-vous commander ?</h2>
          <p className="text-sm font-medium text-pomme-ink/65">Les 3 façons ci-dessous mènent à la même commande — choisissez celle qui vous convient.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 items-start">
          <div className="bg-white rounded-2xl shadow-card p-5 text-center space-y-3 flex flex-col">
            <div className="text-2xl">🔑</div>
            <h3 className="font-bold text-pomme-ink">Se connecter</h3>
            <p className="text-xs font-medium text-pomme-ink/65 flex-1">Vous avez déjà un compte ? Vos enfants et vos préférences sont prêts.</p>
            <Link href={`/parent/connexion?suite=${suite}`} className="press bg-white border border-pomme-line/60 text-pomme-ink rounded-xl px-4 py-2.5 text-sm font-semibold hover:border-pomme-apple-deep hover:text-pomme-apple-deep transition-colors">
              Se connecter
            </Link>
          </div>

          <div className="relative bg-white rounded-2xl shadow-glow ring-2 ring-pomme-apple-deep p-5 pt-6 text-center space-y-3 flex flex-col sm:scale-105">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-pomme-blush-deep text-white text-[11px] font-bold tracking-wide uppercase px-3 py-1 rounded-full shadow-soft">
              ✨ Nouveau
            </span>
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

          <div className="relative bg-white rounded-2xl shadow-card p-5 pt-6 text-center space-y-3 flex flex-col">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-pomme-leaf text-white text-[11px] font-bold tracking-wide uppercase px-3 py-1 rounded-full shadow-soft">
              ✓ Comme avant
            </span>
            <div className="text-2xl">📝</div>
            <h3 className="font-bold text-pomme-ink">Commander comme invité</h3>
            <p className="text-xs font-medium text-pomme-ink/65 flex-1">La méthode habituelle — aucun changement, aucun compte requis.</p>
            <button onClick={() => setModeInvite(true)} className="press bg-white border border-pomme-line/60 text-pomme-ink rounded-xl px-4 py-2.5 text-sm font-semibold hover:border-pomme-apple-deep hover:text-pomme-apple-deep transition-colors">
              Commander sans compte
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FormulaireConnecte
      parent={parent} institutionId={institutionId} menuId={menuId} journees={journees}
      offreFondation={offreFondation} offreFormatPetit={offreFormatPetit}
    />
  );
}

function FormulaireConnecte({ parent, institutionId, menuId, journees, offreFondation, offreFormatPetit }: {
  parent: Parent; institutionId: string; menuId: string; journees: JourneePourCommande[];
  offreFondation: boolean; offreFormatPetit: boolean;
}) {
  const enfantsEligibles = parent.enfants.filter((e) => e.institution.id === institutionId);
  const [enfantId, setEnfantId] = useState(enfantsEligibles[0]?.id ?? '');
  const [choix, setChoix] = useState<Record<string, Choix>>({});
  const [modePaiement, setModePaiement] = useState(parent.modePaiementPrefere ?? 'VIREMENT_INTERAC');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState(false);

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
        } else {
          setChoix({});
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

  const choisir = (journeeId: string, selectionId: string, taille: string) => {
    setSucces(false);
    setChoix((cur) => ({ ...cur, [journeeId]: { selectionId, taille } }));
  };
  const retirerJournee = (journeeId: string) => {
    setSucces(false);
    setChoix((cur) => { const suivant = { ...cur }; delete suivant[journeeId]; return suivant; });
  };

  const envoyer = async () => {
    setErreur('');
    const lignes = Object.entries(choix).map(([journeeId, c]) => ({ journeeId, selectionId: c.selectionId, taille: c.taille }));
    if (lignes.length === 0) { setErreur('Choisissez au moins une journée.'); return; }
    setEnCours(true);
    const res = await fetch('/api/parent/commandes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enfantId, menuId, modePaiement: parent.prepayeAnnuel ? 'PREPAYE' : modePaiement, lignes }),
    });
    setEnCours(false);
    if (!res.ok) { setErreur((await res.json()).error); return; }
    setSucces(true);
  };

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

      <SelecteurJournees journees={journees} choix={choix} onChoisir={choisir} onRetirer={retirerJournee} offreFormatPetit={offreFormatPetit} />
      {parent.prepayeAnnuel ? (
        <p className="text-sm font-medium text-pomme-ink/65 bg-pomme-apple-light/20 rounded-xl px-3.5 py-2.5">
          Facturation prépayée à l&rsquo;année — aucun paiement requis pour cette commande.
        </p>
      ) : (
        <SelecteurPaiement valeur={modePaiement} onChange={(v) => { setSucces(false); setModePaiement(v); }} offreFondation={offreFondation} />
      )}

      {erreur && <p className="animate-fade-in-up text-sm text-status-critical font-medium">{erreur}</p>}
      {succes && (
        <p className="animate-scale-in text-sm text-status-good font-bold bg-status-good/10 rounded-xl px-4 py-3 text-center">
          ✓ Commande envoyée — merci !
        </p>
      )}

      <button
        onClick={envoyer} disabled={enCours}
        className="press w-full bg-pomme-apple-deep text-white rounded-xl px-4 py-3.5 text-sm font-bold shadow-soft hover:bg-pomme-leaf hover:shadow-lifted hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {enCours ? 'Envoi…' : 'Envoyer ma commande'}
      </button>
    </div>
  );
}

function FormulaireInvite({ menuId, journees, onAnnuler, offreFondation, offreFormatPetit }: {
  menuId: string; journees: JourneePourCommande[]; onAnnuler: () => void;
  offreFondation: boolean; offreFormatPetit: boolean;
}) {
  const [choix, setChoix] = useState<Record<string, Choix>>({});
  const [modePaiement, setModePaiement] = useState('VIREMENT_INTERAC');
  const [nomDeFamille, setNomDeFamille] = useState('');
  const [prenom, setPrenom] = useState('');
  const [niveau, setNiveau] = useState('');
  const [intolerances, setIntolerances] = useState<string[]>([]);
  const [autreIntolerance, setAutreIntolerance] = useState('');
  const [parentNom, setParentNom] = useState('');
  const [parentTelephone, setParentTelephone] = useState('');
  const [parentCourriel, setParentCourriel] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState(false);

  const choisir = (journeeId: string, selectionId: string, taille: string) => {
    setSucces(false);
    setChoix((cur) => ({ ...cur, [journeeId]: { selectionId, taille } }));
  };
  const retirerJournee = (journeeId: string) => {
    setSucces(false);
    setChoix((cur) => { const suivant = { ...cur }; delete suivant[journeeId]; return suivant; });
  };

  const envoyer = async () => {
    setErreur('');
    const lignes = Object.entries(choix).map(([journeeId, c]) => ({ journeeId, selectionId: c.selectionId, taille: c.taille }));
    if (!parentNom || !parentTelephone || !parentCourriel || !nomDeFamille || !prenom || !niveau) {
      setErreur('Tous les champs sont requis, sauf les allergies.');
      return;
    }
    if (lignes.length === 0) { setErreur('Choisissez au moins une journée.'); return; }

    setEnCours(true);
    const res = await fetch('/api/parent/commandes-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentNom, parentTelephone, parentCourriel,
        nomDeFamille, prenom, niveau, intolerances, autreIntolerance,
        menuId, modePaiement, lignes,
      }),
    });
    setEnCours(false);
    if (!res.ok) { setErreur((await res.json()).error); return; }
    setSucces(true);
  };

  return (
    <div className="animate-fade-in-up bg-white rounded-2xl shadow-glow p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-display font-semibold text-pomme-leaf-deep">Commander comme invité</h2>
        <button onClick={onAnnuler} className="text-xs font-medium text-pomme-ink/60 hover:text-pomme-apple-deep shrink-0">
          ← Retour
        </button>
      </div>

      <SelecteurJournees journees={journees} choix={choix} onChoisir={choisir} onRetirer={retirerJournee} offreFormatPetit={offreFormatPetit} />
      <SelecteurPaiement valeur={modePaiement} onChange={(v) => { setSucces(false); setModePaiement(v); }} offreFondation={offreFondation} />

      <div className="border-t border-pomme-line/50 pt-4 space-y-4">
        <h3 className="text-sm font-bold text-pomme-ink">Information de l&rsquo;élève</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-pomme-ink/85">
            Prénom *
            <input value={prenom} onChange={(e) => setPrenom(e.target.value)} className={INPUT} />
          </label>
          <label className="block text-sm font-medium text-pomme-ink/85">
            Nom de famille *
            <input value={nomDeFamille} onChange={(e) => setNomDeFamille(e.target.value)} className={INPUT} />
          </label>
        </div>
        <div>
          <span className="block text-sm font-medium text-pomme-ink/85 mb-2">Niveau *</span>
          <div className="flex flex-wrap gap-2">
            {NIVEAUX.map((n) => <ChoixPuce key={n} actif={niveau === n} onClick={() => setNiveau(n)}>{n}</ChoixPuce>)}
          </div>
        </div>
        <div>
          <span className="block text-sm font-medium text-pomme-ink/85 mb-2">Intolérance / allergie</span>
          <div className="flex flex-wrap gap-2 mb-2">
            {INTOLERANCES.map((a) => (
              <ChoixPuce key={a} actif={intolerances.includes(a)} onClick={() => setIntolerances((cur) => cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a])}>
                {a}
              </ChoixPuce>
            ))}
          </div>
          <input value={autreIntolerance} onChange={(e) => setAutreIntolerance(e.target.value)} placeholder="Autre (préciser)" className={INPUT} />
        </div>
      </div>

      <div className="border-t border-pomme-line/50 pt-4 space-y-3">
        <h3 className="text-sm font-bold text-pomme-ink">Information du parent</h3>
        <label className="block text-sm font-medium text-pomme-ink/85">
          Nom *
          <input value={parentNom} onChange={(e) => setParentNom(e.target.value)} className={INPUT} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-pomme-ink/85">
            Téléphone *
            <input value={parentTelephone} onChange={(e) => setParentTelephone(e.target.value)} className={INPUT} />
          </label>
          <label className="block text-sm font-medium text-pomme-ink/85">
            Courriel *
            <input type="email" value={parentCourriel} onChange={(e) => setParentCourriel(e.target.value)} className={INPUT} />
          </label>
        </div>
      </div>

      {erreur && <p className="animate-fade-in-up text-sm text-status-critical font-medium">{erreur}</p>}
      {succes && (
        <p className="animate-scale-in text-sm text-status-good font-bold bg-status-good/10 rounded-xl px-4 py-3 text-center">
          ✓ Commande envoyée — merci !
        </p>
      )}

      <button
        onClick={envoyer} disabled={enCours}
        className="press w-full bg-pomme-apple-deep text-white rounded-xl px-4 py-3.5 text-sm font-bold shadow-soft hover:bg-pomme-leaf hover:shadow-lifted hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {enCours ? 'Envoi…' : 'Envoyer ma commande'}
      </button>
    </div>
  );
}
