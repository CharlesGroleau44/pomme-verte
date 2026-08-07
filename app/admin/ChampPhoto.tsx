'use client';
// app/admin/ChampPhoto.tsx
// Un emplacement image réutilisable (photo de repas ou logo
// d'institution) : téléverse au choix du fichier, affiche l'aperçu,
// permet de retirer. `rond` + `taille` ajustent la présentation pour
// un usage logo (badge circulaire, plus grand).
import { useRef, useState } from 'react';

export default function ChampPhoto({
  label,
  url,
  onChange,
  rond = false,
  taille = 96,
  aide,
}: {
  label: string;
  url: string | null;
  onChange: (url: string | null) => void;
  rond?: boolean;
  taille?: number;
  aide?: string;
}) {
  const [enCours, setEnCours] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const style = { width: taille, height: taille };
  const formeClasse = rond ? 'rounded-full' : 'rounded-lg';

  const televerser = async (fichier: File) => {
    setEnCours(true);
    const formData = new FormData();
    formData.append('fichier', fichier);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    setEnCours(false);
    if (!res.ok) {
      const { error } = await res.json();
      alert(error);
      return;
    }
    const { url: nouvelleUrl } = await res.json();
    onChange(nouvelleUrl);
  };

  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium text-pomme-ink/50">{label}</span>
      {url ? (
        <div className="relative" style={style}>
          <img src={url} alt={label} className={`w-full h-full object-cover border border-pomme-soft ${formeClasse}`} />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-2 -right-2 bg-white border border-pomme-line/50 rounded-full w-5 h-5 text-xs leading-none shadow-soft hover:text-status-critical"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={enCours}
          onClick={() => inputRef.current?.click()}
          style={style}
          className={`border-2 border-dashed border-pomme-line/50 text-xs text-pomme-ink/40 hover:border-pomme-apple-deep hover:text-pomme-apple-deep transition-colors disabled:opacity-50 ${formeClasse}`}
        >
          {enCours ? 'Envoi…' : '+ Photo'}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const fichier = e.target.files?.[0];
          if (fichier) televerser(fichier);
          e.target.value = '';
        }}
      />
      {aide && <p className="text-xs text-pomme-ink/35 max-w-[14rem]">{aide}</p>}
    </div>
  );
}
