// lib/dashboard.ts
// Logique partagée par les tableaux de bord de section (Institutions,
// Repas, Menus) — regroupement par semaine et formatage relatif des
// dates. Isolée ici comme menu-logic.ts, testable indépendamment du DOM.

export function debutSemaine(d: Date): Date {
  const jour = d.getDay(); // 0 = dimanche … 6 = samedi
  const decalage = jour === 0 ? 6 : jour - 1; // jours écoulés depuis lundi
  const debut = new Date(d);
  debut.setHours(0, 0, 0, 0);
  debut.setDate(debut.getDate() - decalage);
  return debut;
}

export type SemaineCompte = { debut: Date; compte: number };

/**
 * Regroupe une liste de dates par semaine (lundi au dimanche), sur les
 * `nbSemaines` dernières semaines glissantes (incluant celle en cours),
 * en conservant les semaines à zéro pour que le graphique reste continu.
 */
export function semainesRecentes(dates: Date[], nbSemaines = 8): SemaineCompte[] {
  const semaineActuelle = debutSemaine(new Date());
  const semaines: SemaineCompte[] = [];

  for (let i = nbSemaines - 1; i >= 0; i--) {
    const debut = new Date(semaineActuelle);
    debut.setDate(debut.getDate() - i * 7);
    semaines.push({ debut, compte: 0 });
  }

  for (const d of dates) {
    const cle = debutSemaine(d).getTime();
    const semaine = semaines.find((s) => s.debut.getTime() === cle);
    if (semaine) semaine.compte++;
  }

  return semaines;
}

/** Formate une date en « il y a … » — jamais plus précis que l'heure. */
export function relatif(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffJ = Math.floor(diffH / 24);

  if (diffMin < 1) return 'à l\'instant';
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffH < 24) return `il y a ${diffH} h`;
  if (diffJ === 1) return 'hier';
  if (diffJ < 7) return `il y a ${diffJ} jours`;
  if (diffJ < 30) return `il y a ${Math.floor(diffJ / 7)} sem.`;
  return date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
}

export function fmtEtiquetteSemaine(debut: Date): string {
  return debut.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
}
