'use client';
// app/admin/institutions/ChampsFiche.tsx
// Les champs de la fiche institution, partagés entre la création et
// l'édition — seule la logique de sauvegarde diffère d'une page à l'autre.
import ChampPhoto from '../ChampPhoto';

export type FormeFiche = {
  nom: string;
  logoUrl: string | null;
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
  offreFondation: boolean;
  offreFormatPetit: boolean;
};

export const FICHE_VIDE: FormeFiche = {
  nom: '',
  logoUrl: null,
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
  offreFondation: false,
  offreFormatPetit: false,
};

const INPUT = 'border border-pomme-line/50 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40 focus:border-pomme-apple-deep transition-shadow';

export default function ChampsFiche({
  form,
  setForm,
}: {
  form: FormeFiche;
  setForm: (f: FormeFiche) => void;
}) {
  const champ = (cle: Exclude<keyof FormeFiche, 'offreFondation' | 'offreFormatPetit'>) => ({
    value: form[cle] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [cle]: e.target.value }),
  });

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
    </div>
  );
}
