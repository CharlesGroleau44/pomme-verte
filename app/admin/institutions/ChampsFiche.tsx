'use client';
// app/admin/institutions/ChampsFiche.tsx
// Les champs de la fiche institution, partagés entre la création et
// l'édition — seule la logique de sauvegarde diffère d'une page à l'autre.
import { useEffect, useRef, useState } from 'react';
import ChampPhoto from '../ChampPhoto';
import { CHAMP_NU } from '@/lib/ui';

export type FormeFiche = {
  nom: string;
  logoUrl: string | null;
  prospectusUrl: string | null;
  adresse: string;
  ville: string;
  province: string;
  codePostal: string;
  telephone: string;
  courriel: string;
  siteWeb: string;
  personneContact: string;
  telephoneContact: string;
  courrielContact: string;
  notes: string;
  prixRepasDepannage: string;
  politiques: string;
  offreFondation: boolean;
  offreFormatPetit: boolean;
  niveauxFormatPetit: string[];
  calendrierScolaireId: string | null;
};

export const FICHE_VIDE: FormeFiche = {
  nom: '',
  logoUrl: null,
  prospectusUrl: null,
  adresse: '',
  ville: '',
  province: 'QC',
  codePostal: '',
  telephone: '',
  courriel: '',
  siteWeb: '',
  personneContact: '',
  telephoneContact: '',
  courrielContact: '',
  notes: '',
  prixRepasDepannage: '',
  politiques: '',
  offreFondation: false,
  offreFormatPetit: false,
  niveauxFormatPetit: [],
  calendrierScolaireId: null,
};

type Calendrier = { id: string; nom: string };

const INPUT = CHAMP_NU;

// Dupliqué de app/menus/[institutionId]/[menuId]/FormulaireCommande.tsx —
// les niveaux scolaires admissibles à l'entente annuelle se choisissent
// parmi la même liste que le niveau d'un enfant.
const NIVEAUX = ['Préscolaire', '1', '2', '3', '4', '5', '6', 'Adulte'];

export default function ChampsFiche({
  form,
  setForm,
}: {
  form: FormeFiche;
  setForm: (f: FormeFiche) => void;
}) {
  const champ = (cle: Exclude<keyof FormeFiche, 'offreFondation' | 'offreFormatPetit' | 'niveauxFormatPetit' | 'calendrierScolaireId' | 'prospectusUrl'>) => ({
    value: form[cle] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [cle]: e.target.value }),
  });

  const [calendriers, setCalendriers] = useState<Calendrier[]>([]);
  useEffect(() => {
    fetch('/api/calendriers').then((r) => r.json()).then(setCalendriers);
  }, []);

  const [enCoursProspectus, setEnCoursProspectus] = useState(false);
  const inputProspectusRef = useRef<HTMLInputElement>(null);
  const televerserProspectus = async (fichier: File) => {
    setEnCoursProspectus(true);
    const formData = new FormData();
    formData.append('fichier', fichier);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    setEnCoursProspectus(false);
    if (!res.ok) {
      const { error } = await res.json();
      alert(error);
      return;
    }
    const { url } = await res.json();
    setForm({ ...form, prospectusUrl: url });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <ChampPhoto
          label="Logo"
          url={form.logoUrl}
          onChange={(url) => setForm({ ...form, logoUrl: url })}
          rond
          taille={112}
          aide="Format carré recommandé, min. 400 × 400 px, PNG (fond transparent) ou JPG, 8 Mo max."
        />
        <label className="block text-sm font-medium text-pomme-ink/85 flex-1 w-full">
          Nom de l&rsquo;institution
          <input {...champ('nom')} placeholder="École, CPE, RPA…" className={`w-full mt-1 ${INPUT}`} />
        </label>
      </div>

      <div>
        <span className="block text-sm font-semibold text-pomme-ink/85 mb-2">Prospectus (PDF)</span>
        <p className="text-xs text-pomme-ink/60 mb-2">
          Le dépliant de l&rsquo;institution — un bouton &laquo;&nbsp;Voir le prospectus&nbsp;&raquo; l&rsquo;affiche sur la page publique du menu.
        </p>
        <div className="flex items-center gap-3">
          {form.prospectusUrl ? (
            <>
              <a href={form.prospectusUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-pomme-apple-deep hover:underline">
                Voir le fichier actuel →
              </a>
              <button type="button" onClick={() => setForm({ ...form, prospectusUrl: null })} className="text-xs font-medium text-pomme-ink/50 hover:text-status-critical">
                Retirer
              </button>
            </>
          ) : (
            <span className="text-sm text-pomme-ink/50">Aucun prospectus téléversé</span>
          )}
          <button
            type="button"
            disabled={enCoursProspectus}
            onClick={() => inputProspectusRef.current?.click()}
            className="press text-xs font-semibold text-pomme-apple-deep border border-pomme-apple-light/60 rounded-lg px-3 py-1.5 hover:bg-pomme-soft/60 transition-colors disabled:opacity-60"
          >
            {enCoursProspectus ? 'Envoi…' : form.prospectusUrl ? 'Remplacer' : 'Téléverser'}
          </button>
          <input
            ref={inputProspectusRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const fichier = e.target.files?.[0];
              if (fichier) televerserProspectus(fichier);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <div>
        <span className="block text-sm font-semibold text-pomme-ink/85 mb-2">Adresse</span>
        <div className="space-y-2">
          <input {...champ('adresse')} placeholder="Numéro et rue" className={`w-full ${INPUT}`} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input {...champ('ville')} placeholder="Ville" className={INPUT} />
            <input {...champ('province')} placeholder="Province" className={INPUT} />
            <input {...champ('codePostal')} placeholder="Code postal" className={INPUT} />
          </div>
        </div>
      </div>

      <div>
        <span className="block text-sm font-semibold text-pomme-ink/85 mb-2">Coordonnées</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input {...champ('telephone')} placeholder="Téléphone" className={INPUT} />
          <input {...champ('courriel')} placeholder="Courriel" className={INPUT} />
          <input {...champ('siteWeb')} placeholder="Site web" className={`sm:col-span-2 ${INPUT}`} />
        </div>
      </div>

      <div>
        <span className="block text-sm font-semibold text-pomme-ink/85 mb-2">Personne contact</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input {...champ('personneContact')} placeholder="Nom" className={`sm:col-span-2 ${INPUT}`} />
          <input {...champ('telephoneContact')} placeholder="Téléphone direct" className={INPUT} />
          <input {...champ('courrielContact')} placeholder="Courriel direct" className={INPUT} />
        </div>
      </div>

      <label className="block text-sm font-medium text-pomme-ink/85">
        Notes / autres informations
        <textarea {...champ('notes')} rows={3} className={`w-full mt-1 ${INPUT}`} />
      </label>

      <label className="block text-sm font-medium text-pomme-ink/85">
        Calendrier scolaire
        <select
          value={form.calendrierScolaireId ?? ''}
          onChange={(e) => setForm({ ...form, calendrierScolaireId: e.target.value || null })}
          className={`w-full mt-1 ${INPUT}`}
        >
          <option value="">Aucun — génère lundi à vendredi sans exclusion</option>
          {calendriers.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
        <span className="block mt-1 text-xs font-normal text-pomme-ink/60">
          Les journées pédagogiques et congés du calendrier rattaché sont exclues automatiquement à la création d&rsquo;un menu — voir /admin/calendriers.
        </span>
      </label>

      <div>
        <span className="block text-sm font-semibold text-pomme-ink/85 mb-2">Commande en ligne — options offertes</span>
        <div className="space-y-2">
          <label className="flex items-center gap-2.5 text-sm font-medium text-pomme-ink/85">
            <input
              type="checkbox"
              checked={form.offreFormatPetit}
              onChange={(e) => setForm({ ...form, offreFormatPetit: e.target.checked })}
              className="h-4 w-4 rounded border-pomme-line/60 text-pomme-apple-deep focus:ring-pomme-apple-mid/40"
            />
            Offre le format &laquo;&nbsp;Petit repas&nbsp;&raquo; (en plus de Régulier / Portion+)
          </label>
          {form.offreFormatPetit && (
            <div className="ml-6 pl-3 border-l-2 border-pomme-line/40">
              <span className="block text-xs font-semibold text-pomme-ink/70 mb-1">Réservé à ces niveaux (vide = tous)</span>
              <div className="flex flex-wrap gap-2">
                {NIVEAUX.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm({
                      ...form,
                      niveauxFormatPetit: form.niveauxFormatPetit.includes(n)
                        ? form.niveauxFormatPetit.filter((x) => x !== n)
                        : [...form.niveauxFormatPetit, n],
                    })}
                    className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      form.niveauxFormatPetit.includes(n)
                        ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep'
                        : 'bg-white border-pomme-line/60 text-pomme-ink/85 hover:border-pomme-apple-deep'
                    }`}
                  >
                    {n === 'Préscolaire' ? 'Maternelle' : n === 'Adulte' ? 'Adulte' : `${n}e année`}
                  </button>
                ))}
              </div>
            </div>
          )}
          <label className="flex items-center gap-2.5 text-sm font-medium text-pomme-ink/85">
            <input
              type="checkbox"
              checked={form.offreFondation}
              onChange={(e) => setForm({ ...form, offreFondation: e.target.checked })}
              className="h-4 w-4 rounded border-pomme-line/60 text-pomme-apple-deep focus:ring-pomme-apple-mid/40"
            />
            Offre le mode de paiement &laquo;&nbsp;Fondation&nbsp;&raquo;
          </label>
        </div>
      </div>

      <div>
        <span className="block text-sm font-semibold text-pomme-ink/85 mb-1">Politiques imprimées sur le menu PDF</span>
        <p className="text-xs text-pomme-ink/60 mb-3">
          Ce bloc apparaît au bas du menu PDF envoy&eacute; aux parents. C&rsquo;est ce qui remplace
          les r&egrave;gles de votre prospectus papier &mdash; laissez vide pour ne rien imprimer.
        </p>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-pomme-ink/85">
            Prix du repas d&eacute;pannage
            <input
              {...champ('prixRepasDepannage')}
              inputMode="decimal"
              placeholder="8.00"
              className={`w-40 mt-1 ${INPUT}`}
            />
            <span className="ml-2 text-xs text-pomme-ink/60">$ &mdash; pour l&rsquo;&eacute;l&egrave;ve qui a oubli&eacute; sa bo&icirc;te &agrave; lunch</span>
          </label>
          <label className="block text-sm font-medium text-pomme-ink/85">
            Autres politiques (cr&eacute;dits, ch&egrave;ques, argent comptant&hellip;)
            <textarea {...champ('politiques')} rows={5} className={`w-full mt-1 ${INPUT}`} />
          </label>
        </div>
      </div>
    </div>
  );
}
