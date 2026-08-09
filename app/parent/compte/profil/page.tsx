'use client';
// app/parent/compte/profil/page.tsx
import { useState } from 'react';
import { useParentCompte } from '../ContexteParent';
import { IconeCadenas, IconeModifier } from '../../Icones';

const INPUT = 'w-full border border-pomme-line/50 rounded-xl px-3.5 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40 focus:border-pomme-apple-deep transition-shadow';

export default function ProfilPage() {
  const { parent, recharger } = useParentCompte();
  const [edition, setEdition] = useState(false);
  const [nom, setNom] = useState(parent.nom);
  const [telephone, setTelephone] = useState(parent.telephone ?? '');
  const [courriel, setCourriel] = useState(parent.courriel);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState(false);

  const [motDePasseActuel, setMotDePasseActuel] = useState('');
  const [motDePasseNouveau, setMotDePasseNouveau] = useState('');
  const [motDePasseConfirme, setMotDePasseConfirme] = useState('');
  const [enCoursMdp, setEnCoursMdp] = useState(false);
  const [erreurMdp, setErreurMdp] = useState('');
  const [succesMdp, setSuccesMdp] = useState(false);

  const enregistrer = async () => {
    setErreur(''); setSucces(false);
    if (!nom.trim()) { setErreur('Le nom est requis.'); return; }
    setEnCours(true);
    const res = await fetch('/api/parent/moi', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, telephone: telephone || null, courriel }),
    });
    setEnCours(false);
    if (!res.ok) { setErreur((await res.json()).error); return; }
    setSucces(true);
    setEdition(false);
    recharger();
  };

  const changerMotDePasse = async () => {
    setErreurMdp(''); setSuccesMdp(false);
    if (motDePasseNouveau.length < 8) { setErreurMdp('Le nouveau mot de passe doit contenir au moins 8 caractères.'); return; }
    if (motDePasseNouveau !== motDePasseConfirme) { setErreurMdp('La confirmation ne correspond pas.'); return; }
    setEnCoursMdp(true);
    const res = await fetch('/api/parent/moi', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motDePasseActuel, motDePasseNouveau }),
    });
    setEnCoursMdp(false);
    if (!res.ok) { setErreurMdp((await res.json()).error); return; }
    setSuccesMdp(true);
    setMotDePasseActuel(''); setMotDePasseNouveau(''); setMotDePasseConfirme('');
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {parent.prepayeAnnuel && (
        <div className="animate-fade-in-up bg-status-good/10 text-status-good rounded-2xl px-5 py-3.5 text-sm font-semibold flex items-center gap-2">
          ✓ Votre facturation est prépayée à l’année — configuré directement par le traiteur.
        </div>
      )}

      <div className="animate-fade-in-up bg-white rounded-2xl shadow-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-semibold text-pomme-leaf-deep">Mes informations</h2>
          {!edition && (
            <button onClick={() => { setEdition(true); setSucces(false); }} className="flex items-center gap-1.5 text-sm font-semibold text-pomme-apple-deep hover:underline">
              <IconeModifier /> Modifier
            </button>
          )}
        </div>

        {edition ? (
          <div className="space-y-3.5">
            <label className="block text-sm font-medium text-pomme-ink/85">
              Nom
              <input value={nom} onChange={(e) => setNom(e.target.value)} className={INPUT} />
            </label>
            <label className="block text-sm font-medium text-pomme-ink/85">
              Téléphone
              <input value={telephone} onChange={(e) => setTelephone(e.target.value)} className={INPUT} />
            </label>
            <label className="block text-sm font-medium text-pomme-ink/85">
              Courriel
              <input type="email" value={courriel} onChange={(e) => setCourriel(e.target.value)} className={INPUT} />
            </label>
            {erreur && <p className="text-sm text-status-critical font-medium">{erreur}</p>}
            <div className="flex gap-2">
              <button onClick={enregistrer} disabled={enCours} className="press bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf hover:shadow-lifted transition-all disabled:opacity-60">
                {enCours ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button
                onClick={() => { setEdition(false); setNom(parent.nom); setTelephone(parent.telephone ?? ''); setCourriel(parent.courriel); setErreur(''); }}
                className="text-sm font-semibold text-pomme-ink/60 px-4 py-2.5"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <div className="text-xs font-semibold text-pomme-ink/55 uppercase tracking-wide">Nom</div>
              <div className="text-sm font-semibold text-pomme-ink mt-1">{parent.nom}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-pomme-ink/55 uppercase tracking-wide">Téléphone</div>
              <div className="text-sm font-semibold text-pomme-ink mt-1">{parent.telephone || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-pomme-ink/55 uppercase tracking-wide">Courriel</div>
              <div className="text-sm font-semibold text-pomme-ink mt-1 truncate">{parent.courriel}</div>
            </div>
          </div>
        )}
        {succes && !edition && <p className="animate-scale-in text-sm text-status-good font-semibold">✓ Profil mis à jour.</p>}
      </div>

      <div className="animate-fade-in-up stagger-1 bg-white rounded-2xl shadow-card p-6 space-y-4">
        <h2 className="text-xl font-display font-semibold text-pomme-leaf-deep flex items-center gap-2"><IconeCadenas /> Mot de passe</h2>
        <div className="space-y-3.5">
          <label className="block text-sm font-medium text-pomme-ink/85">
            Mot de passe actuel
            <input type="password" value={motDePasseActuel} onChange={(e) => setMotDePasseActuel(e.target.value)} className={INPUT} />
          </label>
          <div className="grid sm:grid-cols-2 gap-3.5">
            <label className="block text-sm font-medium text-pomme-ink/85">
              Nouveau mot de passe
              <input type="password" value={motDePasseNouveau} onChange={(e) => setMotDePasseNouveau(e.target.value)} className={INPUT} />
            </label>
            <label className="block text-sm font-medium text-pomme-ink/85">
              Confirmer
              <input type="password" value={motDePasseConfirme} onChange={(e) => setMotDePasseConfirme(e.target.value)} className={INPUT} />
            </label>
          </div>
          <p className="text-xs text-pomme-ink/55">Au moins 8 caractères.</p>
          {erreurMdp && <p className="animate-fade-in-up text-sm text-status-critical font-medium">{erreurMdp}</p>}
          {succesMdp && <p className="animate-scale-in text-sm text-status-good font-semibold">✓ Mot de passe modifié.</p>}
          <button
            onClick={changerMotDePasse}
            disabled={enCoursMdp || !motDePasseActuel || !motDePasseNouveau}
            className="press bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf hover:shadow-lifted transition-all disabled:opacity-60"
          >
            {enCoursMdp ? 'Modification…' : 'Changer le mot de passe'}
          </button>
        </div>
      </div>
    </div>
  );
}
