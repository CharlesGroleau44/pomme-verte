'use client';
// app/admin/dashboard/TendanceHebdo.tsx
// Graphique à colonnes des entrées par semaine (8 dernières semaines
// glissantes). Suit le skill dataviz : une seule teinte (pas de légende
// nécessaire pour une série unique), colonnes ≤24px à extrémité arrondie
// 4px et base carrée, gridlines hairline, étiquette directe seulement sur
// la dernière colonne, infobulle au survol/focus sur chaque colonne.
import { useState } from 'react';
import { semainesRecentes, fmtEtiquetteSemaine } from '@/lib/dashboard';

const LARGEUR = 640;
const HAUTEUR_ZONE = 120;
const PADDING_HAUT = 28; // place pour l'étiquette directe de la dernière colonne
const PADDING_BAS = 22; // place pour les étiquettes d'axe

function cheminColonne(x: number, largeur: number, hauteurBarre: number, base: number) {
  const r = Math.min(4, largeur / 2, hauteurBarre);
  const yTop = base - hauteurBarre;
  if (hauteurBarre <= 0) return '';
  return `M ${x} ${base} L ${x} ${yTop + r} Q ${x} ${yTop} ${x + r} ${yTop} L ${x + largeur - r} ${yTop} Q ${x + largeur} ${yTop} ${x + largeur} ${yTop + r} L ${x + largeur} ${base} Z`;
}

export default function TendanceHebdo({ titre, dates }: { titre: string; dates: Date[] }) {
  const [survol, setSurvol] = useState<number | null>(null);
  const semaines = semainesRecentes(dates, 8);
  const max = Math.max(1, ...semaines.map((s) => s.compte));
  const base = PADDING_HAUT + HAUTEUR_ZONE;
  const bande = LARGEUR / semaines.length;
  const largeurBarre = Math.min(24, bande * 0.5);
  const totalEntrees = semaines.reduce((acc, s) => acc + s.compte, 0);

  const yGrille = [0, 0.5, 1].map((t) => PADDING_HAUT + HAUTEUR_ZONE * (1 - t));

  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold text-pomme-ink/70">{titre}</h3>
        <span className="text-xs text-pomme-ink/40">8 dernières semaines</span>
      </div>

      {totalEntrees === 0 ? (
        <p className="text-sm text-pomme-ink/40 py-10 text-center">Pas encore de données à tracer.</p>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${LARGEUR} ${PADDING_HAUT + HAUTEUR_ZONE + PADDING_BAS}`} className="w-full h-auto overflow-visible">
            {yGrille.map((y, i) => (
              <line key={i} x1={0} y1={y} x2={LARGEUR} y2={y} stroke="#E4E4DD" strokeWidth={1} />
            ))}

            {semaines.map((s, i) => {
              const x = i * bande + (bande - largeurBarre) / 2;
              const hauteurReelle = (s.compte / max) * HAUTEUR_ZONE;
              const hauteurAffichee = s.compte > 0 ? Math.max(hauteurReelle, 3) : 0;
              const estDerniere = i === semaines.length - 1;
              return (
                <g
                  key={s.debut.toISOString()}
                  tabIndex={0}
                  role="img"
                  aria-label={`Semaine du ${fmtEtiquetteSemaine(s.debut)} : ${s.compte} entrée${s.compte > 1 ? 's' : ''}`}
                  onMouseEnter={() => setSurvol(i)}
                  onMouseLeave={() => setSurvol(null)}
                  onFocus={() => setSurvol(i)}
                  onBlur={() => setSurvol(null)}
                  className="cursor-default outline-none"
                >
                  {/* cible de survol plus large que la colonne elle-même */}
                  <rect x={i * bande} y={PADDING_HAUT} width={bande} height={HAUTEUR_ZONE} fill="transparent" />
                  <path
                    d={cheminColonne(x, largeurBarre, hauteurAffichee, base)}
                    fill={survol === i ? '#8FC24A' : '#3B8C47'}
                    className="transition-colors"
                  />
                  {estDerniere && (
                    <text x={x + largeurBarre / 2} y={base - hauteurAffichee - 8} textAnchor="middle" className="fill-pomme-ink/60" fontSize={11} fontWeight={700}>
                      {s.compte}
                    </text>
                  )}
                  <text x={x + largeurBarre / 2} y={base + 16} textAnchor="middle" className="fill-pomme-ink/40" fontSize={10}>
                    {fmtEtiquetteSemaine(s.debut)}
                  </text>
                </g>
              );
            })}
          </svg>

          {survol !== null && (
            <div
              className="absolute -top-1 -translate-y-full bg-pomme-leaf-deep text-white text-xs rounded-lg px-2.5 py-1.5 pointer-events-none shadow-lifted whitespace-nowrap"
              style={{ left: `${((survol + 0.5) / semaines.length) * 100}%`, transform: 'translate(-50%, -100%)' }}
            >
              Semaine du {fmtEtiquetteSemaine(semaines[survol].debut)} — <strong>{semaines[survol].compte}</strong> entrée{semaines[survol].compte > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
