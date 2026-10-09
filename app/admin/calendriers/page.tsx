'use client';
// app/admin/calendriers/page.tsx
// Un calendrier scolaire par centre de services scolaire (ou école privée),
// partagé par les institutions qui en dépendent (voir CalendrierScolaire
// dans prisma/schema.prisma). Pas d'import PDF automatisé ici — décision
// prise avec Charles (2026-08-11) : le format d'un calendrier scolaire varie
// d'un centre de services à l'autre et change d'une année à l'autre, un
// parseur en production serait plus fragile qu'utile pour un geste qui
// n'arrive qu'une fois par an. La liste des jours fermés (pédagogiques,
// congés) se corrige donc directement ici, un clic par jour.
import { useEffect, useState } from 'react';

type Institution = { id: string; nom: string };
type JourFerme = { id: string; date: string; motif: string | null };
type CalendrierListe = {
  id: string; nom: string;
  _count: { institutions: number; joursFermes: number };
};
type CalendrierDetail = {
  id: string; nom: string;
  joursFermes: JourFerme[];
  institutions: Institution[];
};

const JOURS_SEMAINE = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const MOIS_NOM = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

// Une année scolaire va d'août à juin — si on est entre juillet et
// décembre, l'année scolaire "courante" a commencé cette année civile-ci;
// sinon elle a commencé l'année civile précédente.
function anneeScolaireCourante(): number {
  const maintenant = new Date();
  const mois = maintenant.getMonth(); // 0 = janvier
  return mois >= 6 ? maintenant.getFullYear() : maintenant.getFullYear() - 1;
}

// [année civile, mois 0-11] pour chacun des 11 mois août→juin.
function moisAnneeScolaire(anneeDebut: number): { annee: number; mois: number }[] {
  const sequence = [7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5]; // août(7) → juin(5)
  return sequence.map((mois) => ({ annee: mois >= 7 ? anneeDebut : anneeDebut + 1, mois }));
}

function iso(annee: number, mois: number, jour: number): string {
  return `${annee}-${String(mois + 1).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
}

function MiniMois({ annee, mois, joursFermes, onToggle, enCours }: {
  annee: number; mois: number; joursFermes: Set<string>;
  onToggle: (dateIso: string) => void; enCours: string | null;
}) {
  const premierJour = new Date(annee, mois, 1).getDay(); // 0 = dimanche
  const nbJours = new Date(annee, mois + 1, 0).getDate();
  const cases: (number | null)[] = [...Array(premierJour).fill(null), ...Array.from({ length: nbJours }, (_, i) => i + 1)];

  return (
    <div className="bg-white rounded-2xl shadow-card p-4">
      <div className="text-sm font-bold text-pomme-leaf-deep mb-2.5">{MOIS_NOM[mois]} {annee}</div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {JOURS_SEMAINE.map((j, i) => (
          <div key={i} className="text-[10px] font-semibold text-pomme-ink/45 pb-1">{j}</div>
        ))}
        {cases.map((jour, i) => {
          if (jour === null) return <div key={i} />;
          const dateIso = iso(annee, mois, jour);
          const weekend = (premierJour + jour - 1) % 7 === 0 || (premierJour + jour - 1) % 7 === 6;
          const ferme = joursFermes.has(dateIso);
          return (
            <button
              key={i}
              type="button"
              disabled={weekend || enCours === dateIso}
              onClick={() => onToggle(dateIso)}
              title={weekend ? undefined : ferme ? 'Fermé — cliquer pour rouvrir' : 'Jour de classe — cliquer pour fermer'}
              className={`press aspect-square rounded-lg text-xs font-semibold transition-all duration-150 disabled:cursor-default ${
                weekend
                  ? 'text-pomme-ink/25'
                  : ferme
                    ? 'bg-status-warning/20 text-status-warning hover:bg-status-warning/30'
                    : 'bg-pomme-soft/60 text-pomme-ink/80 hover:bg-pomme-apple-light/30'
              } ${enCours === dateIso ? 'opacity-40' : ''}`}
            >
              {jour}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendriersPage() {
  const [calendriers, setCalendriers] = useState<CalendrierListe[]>([]);
  const [selectionId, setSelectionId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CalendrierDetail | null>(null);
  const [anneeDebut, setAnneeDebut] = useState(anneeScolaireCourante());
  const [enCours, setEnCours] = useState<string | null>(null);
  const [nouveauNom, setNouveauNom] = useState('');
  const [creationOuverte, setCreationOuverte] = useState(false);

  const chargerListe = async () => {
    const data: CalendrierListe[] = await fetch('/api/calendriers').then((r) => r.json());
    setCalendriers(data);
    if (!selectionId && data.length > 0) setSelectionId(data[0].id);
  };
  useEffect(() => { chargerListe(); }, []);

  const chargerDetail = async (id: string) => {
    const data: CalendrierDetail = await fetch(`/api/calendriers/${id}`).then((r) => r.json());
    setDetail(data);
  };
  useEffect(() => { if (selectionId) chargerDetail(selectionId); }, [selectionId]);

  const toggleJour = async (dateIso: string) => {
    if (!selectionId) return;
    setEnCours(dateIso);
    const res = await fetch(`/api/calendriers/${selectionId}/jours`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateIso }),
    });
    const { ferme } = await res.json();
    setDetail((cur) => {
      if (!cur) return cur;
      const joursFermes = ferme
        ? [...cur.joursFermes, { id: dateIso, date: `${dateIso}T00:00:00.000Z`, motif: null }]
        : cur.joursFermes.filter((j) => j.date.slice(0, 10) !== dateIso);
      return { ...cur, joursFermes };
    });
    setEnCours(null);
    chargerListe();
  };

  const creerCalendrier = async () => {
    if (!nouveauNom.trim()) return;
    const res = await fetch('/api/calendriers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: nouveauNom.trim() }),
    });
    const cal = await res.json();
    setNouveauNom('');
    setCreationOuverte(false);
    await chargerListe();
    setSelectionId(cal.id);
  };

  const joursFermesSet = new Set((detail?.joursFermes ?? []).map((j) => j.date.slice(0, 10)));
  const mois = moisAnneeScolaire(anneeDebut);
  const nbFermesAffiches = [...joursFermesSet].filter((d) => d >= `${anneeDebut}-07-01` && d <= `${anneeDebut + 1}-07-01`).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-display font-semibold text-pomme-leaf-deep">Calendriers scolaires</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnneeDebut((a) => a - 1)}
            className="press h-9 w-9 rounded-full bg-white shadow-card text-pomme-ink/70 hover:text-pomme-apple-deep transition-colors"
          >
            ←
          </button>
          <span className="text-sm font-bold text-pomme-ink px-1">{anneeDebut}–{anneeDebut + 1}</span>
          <button
            onClick={() => setAnneeDebut((a) => a + 1)}
            className="press h-9 w-9 rounded-full bg-white shadow-card text-pomme-ink/70 hover:text-pomme-apple-deep transition-colors"
          >
            →
          </button>
        </div>
      </div>

      <p className="text-xs font-medium text-pomme-ink/60 bg-pomme-soft/50 rounded-xl px-4 py-2.5">
        💡 Cliquez un jour pour le fermer (journée pédagogique, congé) ou le rouvrir. Les journées fermées
        sont automatiquement exclues des nouveaux menus des institutions rattachées à ce calendrier.
      </p>

      <div className="flex flex-wrap gap-2">
        {calendriers.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectionId(c.id)}
            className={`press px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
              selectionId === c.id
                ? 'bg-pomme-apple-deep text-white border-pomme-apple-deep shadow-soft'
                : 'bg-white border-pomme-line/60 text-pomme-ink/85 hover:border-pomme-apple-deep hover:text-pomme-apple-deep'
            }`}
          >
            {c.nom} <span className="opacity-70">· {c._count.institutions} école{c._count.institutions > 1 ? 's' : ''}</span>
          </button>
        ))}
        {creationOuverte ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={nouveauNom}
              onChange={(e) => setNouveauNom(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && creerCalendrier()}
              placeholder="Nom du calendrier"
              className="border border-pomme-line/50 rounded-xl px-3 py-1.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-pomme-apple-mid/40"
            />
            <button onClick={creerCalendrier} className="press text-xs font-bold text-pomme-apple-deep hover:underline px-1">Ajouter</button>
            <button onClick={() => { setCreationOuverte(false); setNouveauNom(''); }} className="text-xs font-medium text-pomme-ink/50 hover:text-status-critical px-1">Annuler</button>
          </div>
        ) : (
          <button
            onClick={() => setCreationOuverte(true)}
            className="press px-3.5 py-2 rounded-full text-sm font-medium border border-dashed border-pomme-line/60 text-pomme-ink/60 hover:border-pomme-apple-deep hover:text-pomme-apple-deep transition-all duration-200"
          >
            + Nouveau calendrier
          </button>
        )}
      </div>

      {detail && (
        <>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs font-medium text-pomme-ink/65">
            <span>{nbFermesAffiches} journée{nbFermesAffiches > 1 ? 's' : ''} fermée{nbFermesAffiches > 1 ? 's' : ''} affichée{nbFermesAffiches > 1 ? 's' : ''}</span>
            {detail.institutions.length > 0 && (
              <span>Écoles : {detail.institutions.map((i) => i.nom).join(', ')}</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mois.map(({ annee, mois: m }) => (
              <MiniMois
                key={`${annee}-${m}`}
                annee={annee} mois={m}
                joursFermes={joursFermesSet}
                onToggle={toggleJour}
                enCours={enCours}
              />
            ))}
          </div>
        </>
      )}

      {calendriers.length === 0 && (
        <p className="text-sm text-pomme-ink/65 bg-white rounded-2xl shadow-card p-5">
          Aucun calendrier pour le moment — créez-en un pour commencer à exclure les journées pédagogiques des menus.
        </p>
      )}
    </div>
  );
}
