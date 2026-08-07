'use client';
// app/admin/repas/ChampPhoto.tsx
// Un emplacement photo (principale ou additionnelle) : téléverse au
// choix du fichier, affiche l'aperçu, permet de retirer.
import { useRef, useState } from 'react';

export default function ChampPhoto({
  label,
  url,
  onChange,
}: {
  label: string;
  url: string | null;
  onChange: (url: string | null) => void;
}) {
  const [enCours, setEnCours] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const televerser = async (fichier: File) => {
    setEnCours(true);
    const formData = new FormData();
    formData.append('fichier', fichier);
    const res = await fetch('/api/repas/photos', { method: 'POST', body: formData });
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
    <div className="space-y-1">
      <span className="block text-xs text-gray-500">{label}</span>
      {url ? (
        <div className="relative w-24 h-24">
          <img src={url} alt={label} className="w-24 h-24 object-cover rounded-lg border" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-2 -right-2 bg-white border rounded-full w-5 h-5 text-xs leading-none shadow"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={enCours}
          onClick={() => inputRef.current?.click()}
          className="w-24 h-24 border-2 border-dashed rounded-lg text-xs text-gray-400 hover:border-emerald-600 hover:text-emerald-700 disabled:opacity-50"
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
    </div>
  );
}
