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
};

export default function ChampsFiche({
  form,
  setForm,
}: {
  form: FormeFiche;
  setForm: (f: FormeFiche) => void;
}) {
  const champ = (cle: keyof FormeFiche) => ({
    value: form[cle] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [cle]: e.target.value }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <ChampPhoto
          label="Logo"
          url={form.logoUrl}
          onChange={(url) => setForm({ ...form, logoUrl: url })}
          rond
          taille={112}
          aide="Format carré recommandé, min. 400 × 400 px, PNG (fond transparent) ou JPG, 8 Mo max."
        />
        <label className="block text-sm flex-1">
          Nom de l&rsquo;institution
          <input {...champ('nom')} placeholder="École, CPE, RPA…" className="w-full border rounded px-3 py-2 text-sm mt-1" />
        </label>
      </div>

      <div>
        <span className="block text-sm font-medium mb-2">Adresse</span>
        <div className="space-y-2">
          <input {...champ('adresse')} placeholder="Numéro et rue" className="w-full border rounded px-3 py-2 text-sm" />
          <div className="grid grid-cols-3 gap-2">
            <input {...champ('ville')} placeholder="Ville" className="border rounded px-3 py-2 text-sm" />
            <input {...champ('province')} placeholder="Province" className="border rounded px-3 py-2 text-sm" />
            <input {...champ('codePostal')} placeholder="Code postal" className="border rounded px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium mb-2">Coordonnées</span>
        <div className="grid grid-cols-2 gap-2">
          <input {...champ('telephone')} placeholder="Téléphone" className="border rounded px-3 py-2 text-sm" />
          <input {...champ('courriel')} placeholder="Courriel" className="border rounded px-3 py-2 text-sm" />
          <input {...champ('siteWeb')} placeholder="Site web" className="border rounded px-3 py-2 text-sm col-span-2" />
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium mb-2">Personne contact</span>
        <div className="grid grid-cols-2 gap-2">
          <input {...champ('personneContact')} placeholder="Nom" className="border rounded px-3 py-2 text-sm col-span-2" />
          <input {...champ('telephoneContact')} placeholder="Téléphone direct" className="border rounded px-3 py-2 text-sm" />
          <input {...champ('courrielContact')} placeholder="Courriel direct" className="border rounded px-3 py-2 text-sm" />
        </div>
      </div>

      <label className="block text-sm">
        Notes / autres informations
        <textarea {...champ('notes')} rows={3} className="w-full border rounded px-3 py-2 text-sm mt-1" />
      </label>
    </div>
  );
}
