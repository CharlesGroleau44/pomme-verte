'use client';
// app/admin/menus/nouveau/page.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { dateLimiteSuggeree } from '@/lib/menu-logic';
import { CHAMP } from '@/lib/ui';
import { photo } from '@/lib/images';

type Institution = { id: string; nom: string; actif: boolean };
type Thematique = { id: string; nom: string; photoUrl: string | null };

const INPUT = CHAMP;

export default function NouveauMenuPage() {
  const router = useRouter();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [debut, setDebut] = useState('');
  const [fin, setFin] = useState('');
  const [thematiques, setThematiques] = useState<Thematique[]>([]);
  const [thematiqueId, setThematiqueId] = useState<string | null>(null);
  const [dateLimite, setDateLimite] = useState('');
  const [datePublication, setDatePublication] = useState('');
  // Vrai tant que la date limite n'a pas été touchée à la main : on la
  // recalcule alors à chaque changement de date de début. Dès que
  // l'utilisatrice la modifie, on cesse d'écraser son choix.
  const [dateLimiteAuto, setDateLimiteAuto] = useState(true);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    fetch('/api/institutions').then((r) => r.json()).then(setInstitutions).catch(() => setInstitutions([]));
    fetch('/api/thematiques').then((r) => r.json()).then(setThematiques).catch(() => setThematiques([]));
  }, []);

  const creer = async () => {
    if (!debut || !fin || !dateLimite || !institutionId) {
      alert('Date de début, date de fin, date limite de commande et une institution sont requis.');
      return;
    }
    setEnCours(true);
    const res = await fetch('/api/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        periodeDebut: debut,
        periodeFin: fin,
        thematiqueId,
        dateLimiteCommande: dateLimite,
        datePublication: datePublication || null,
        institutionId,
      }),
    });
    setEnCours(false);
    if (!res.ok) {
      const { error } = await res.json();
      alert(error);
      return;
    }
    const menu = await res.json();
    // Christine doit VOIR pourquoi des journées manquent, plutôt que de se
    // demander où elles sont passées — voir CalendrierScolaire dans
    // prisma/schema.prisma et POST /api/menus.
    if (menu.joursExclus?.length > 0) {
      const dates = menu.joursExclus
        .map((d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', timeZone: 'UTC' }))
        .join(', ');
      alert(`${menu.joursExclus.length} journée${menu.joursExclus.length > 1 ? 's' : ''} exclue${menu.joursExclus.length > 1 ? 's' : ''} (calendrier scolaire) : ${dates}`);
    }
    router.push(`/admin/menus/${menu.id}`); // direction : assignation des repas par journée
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-extrabold text-pomme-leaf-deep">Nouveau menu</h1>

      <div className="bg-white rounded-2xl shadow-card p-6 space-y-4">
        <div>
          <span className="block text-sm font-semibold text-pomme-ink/85 mb-2">Institution</span>
          <p className="text-xs text-pomme-ink/60 mb-2">
            Un menu appartient à une seule institution — pour servir le même contenu ailleurs,
            dupliquez-le une fois créé.
          </p>
          <div className="flex flex-wrap gap-2">
            {institutions.filter((i) => i.actif).map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => setInstitutionId((cur) => (cur === i.id ? null : i.id))}
                className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  institutionId === i.id
                    ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep'
                    : 'bg-white border-pomme-line/60 text-pomme-ink/85 hover:border-pomme-apple-deep'
                }`}
              >
                {i.nom}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-pomme-ink/85">
            Date de début
            <input
              type="date"
              value={debut}
              onChange={(e) => {
                setDebut(e.target.value);
                // Règle de Christine : fermeture le vendredi précédant le
                // premier repas (voir dateLimiteSuggeree).
                if (dateLimiteAuto && e.target.value) setDateLimite(dateLimiteSuggeree(e.target.value));
              }}
              className={INPUT}
            />
          </label>
          <label className="block text-sm font-medium text-pomme-ink/85">
            Date de fin
            <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} className={INPUT} />
          </label>
        </div>

        <div>
          <span className="block text-sm font-semibold text-pomme-ink/85 mb-2">Thématique</span>
          <p className="text-xs text-pomme-ink/60 mb-2">
            Choisissez une thématique existante. Pour en créer une nouvelle (nom + image),
            passez par <Link href="/admin/thematiques" className="text-pomme-apple-deep font-semibold hover:underline">Thématiques</Link>.
          </p>
          {thematiques.length === 0 ? (
            <p className="text-xs font-medium text-pomme-ink/60">
              Aucune thématique créée pour l&apos;instant — le menu peut être créé sans, et vous
              pourrez lui en attribuer une plus tard.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {thematiques.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setThematiqueId((cur) => (cur === t.id ? null : t.id))}
                  className={`inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    thematiqueId === t.id
                      ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep'
                      : 'bg-white border-pomme-line/60 text-pomme-ink/85 hover:border-pomme-apple-deep'
                  }`}
                >
                  {t.photoUrl && <img {...photo(t.photoUrl, 160)} alt="" className="w-6 h-6 object-contain" />}
                  {t.nom}
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="block text-sm font-medium text-pomme-ink/85">
          Date limite de commande *
          <input
            type="date"
            required
            value={dateLimite}
            onChange={(e) => { setDateLimite(e.target.value); setDateLimiteAuto(false); }}
            className={INPUT}
          />
          <span className="block text-xs text-pomme-ink/60 mt-1 font-medium">
            {dateLimiteAuto && dateLimite
              ? 'Proposée automatiquement : le vendredi précédant le premier repas. Modifiable — pour le 1er menu de l\u2019année, vous pouvez la reporter au jour 1.'
              : 'Obligatoire — le menu se dépublie automatiquement à cette date, 23h59.'}
          </span>
        </label>

        <label className="block text-sm font-medium text-pomme-ink/85">
          Date de publication (optionnel)
          <input
            type="date"
            value={datePublication}
            onChange={(e) => setDatePublication(e.target.value)}
            className={INPUT}
          />
          <span className="block text-xs text-pomme-ink/60 mt-1 font-medium">
            Le menu reste invisible aux parents jusqu&rsquo;à cette date, puis s&rsquo;ouvre automatiquement — utile
            pour construire un menu à l&rsquo;avance sans qu&rsquo;il soit commandable trop tôt. Laissez vide pour
            qu&rsquo;il soit visible dès que vous le publiez.
          </span>
        </label>

        <button
          onClick={creer}
          disabled={enCours}
          className="bg-pomme-apple-deep text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-pomme-leaf transition-colors disabled:opacity-60"
        >
          {enCours ? 'Création…' : 'Créer le menu et générer les journées'}
        </button>
      </div>
    </div>
  );
}
