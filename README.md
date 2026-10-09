# Pomme Verte — Admin (démarrage)

Base de départ pour les modules **Repas** et **Menus** de la plateforme
Traiteur La Pomme Verte. Voir `briefing-claude-code-repas-menus.md` (fourni
séparément) pour la spécification complète — ce README couvre seulement la
mise en route.

## Démarrer

```bash
npm install
cp .env.example .env   # renseigner DATABASE_URL (Postgres — Supabase ou Neon conviennent)
npm run db:push        # crée les tables à partir de prisma/schema.prisma
npm run db:seed        # peuple les 8 institutions + quelques repas d'exemple
npm run dev
```

Ouvrir `http://localhost:3000` — redirige vers `/admin/menus` (après connexion, voir point 6 plus bas).

## Ce qui est déjà fonctionnel

- `prisma/schema.prisma` — modèle de données complet (Institution, Repas, Menu, MenuJournee, MenuJourneeSelection). Un `Menu` appartient à **une seule** institution (FK requise `institutionId`) et porte une `dateLimiteCommande` obligatoire.
- `lib/menu-logic.ts` — génération des journées, résolution override/repas, validation de complétude, `estActivementPublie()` (dépublication automatique à la date limite, 23h59)
- API : `GET/POST /api/repas`, `PATCH/DELETE /api/repas/[id]`, `POST /api/upload` (upload générique — repas ET logos), `GET /api/photos/[filename]` (service)
- API : `GET/POST /api/institutions`, `GET/PATCH/DELETE /api/institutions/[id]`
- API : `GET/POST /api/menus`, `POST /api/menus/[id]/publish` (refuse si journées incomplètes ou date limite dépassée), `POST /api/menus/[id]/dupliquer` (copie complète vers une autre institution, part non publié), `POST /api/journees/[journeeId]/selections`, `PATCH`/`DELETE /api/selections/[selectionId]` (jusqu'à 2 repas/jour, prix éditables par occurrence)
- Pages admin : `/admin/institutions` (liste) + `/admin/institutions/nouveau` + `/admin/institutions/[id]` (fiche complète : logo, adresse, coordonnées, personne contact, notes, dates création/modification, bandeau actif/inactif proéminent à bascule instantanée), `/admin/repas` (liste + création + édition, jusqu'à 3 photos, association à des institutions précises), `/admin/menus` (liste + filtre par institution + gros bouton PUBLIÉ/NON PUBLIÉ + Dupliquer), `/admin/menus/nouveau` (création, institution unique), `/admin/menus/[id]` (montage jour par jour, jusqu'à 2 repas/jour avec nom/description/3 prix éditables par occurrence, gros bouton « Menu complété »)
- **Pages publiques `/menus`** (aucune connexion requise) — `/menus` liste toutes les institutions actives (logo + bouton), `/menus/[institutionId]` liste ses menus **activement publiés** (`estActivementPublie`), `/menus/[institutionId]/[menuId]` affiche le menu jour par jour en lecture seule. Un menu non publié, d'une autre institution, ou dont la date limite est dépassée n'y est jamais visible.
- **Système de design + tableaux de bord** (2026-08-07) — palette de marque (verte, tirée de la présentation officielle du projet), police Nunito, sidebar de navigation (barre d'onglets en bas sous `md`), et sur les 3 sections admin (Institutions/Repas/Menus) : stat tiles, graphique de tendance hebdomadaire (SVG maison, survol/focus avec infobulle, suit le skill dataviz interne), liste des entrées récentes. Voir `DEPLOIEMENT-VPS.md` § Système de design.
- **PDF brandé par menu** (2026-08-07) — `GET /api/menus/[id]/pdf` (accessible sans connexion si le menu est activement publié, toujours accessible à l'admin) génère à la volée (via `@react-pdf/renderer`, photos redimensionnées par `sharp`) le menu jour par jour PLUS un coupon-réponse imprimable (mêmes champs que le formulaire papier actuel du traiteur : choix repas/taille par journée, paiement, info élève/parent). Voir `lib/pdf/MenuDocument.tsx`.
- **Commandes en ligne** (2026-08-07, compte obligatoire depuis le 16 août 2026) — depuis `/menus/[institutionId]/[menuId]` :
  - **Compte parent obligatoire** (`/parent/inscription`, `/parent/connexion`, `/parent/compte`) — courriel/mot de passe (scrypt, session HMAC séparée de l'admin, cookie `pv_parent`), gestion des enfants (école, niveau, allergies), historique de commandes, annulation. Un visiteur non connecté choisit entre se connecter et créer un compte — aucun chemin de commande invité.
  - Une seule commande par (enfant, menu) — soumettre à nouveau modifie plutôt que duplique. `POST /api/parent/commandes` (`lib/commandes.ts`) : menu activement publié, journées/sélections vérifiées comme appartenant bien à ce menu.
  - Paiement **hors ligne** pour cette version (argent/chèque/entente annuelle/virement Interac choisi dans le formulaire, encaissé comme avant) — pas d'intégration de paiement en ligne.
- **Console de traitement des commandes** (2026-08-07) — `/admin/commandes` : stat tiles (commandes, repas, revenu estimé, non payé), filtre par institution ET par menu, bouton **PAYÉ/NON PAYÉ** par commande (`PATCH /api/commandes/[id]`), **rapport de préparation** (vue agrégée par journée → plat → taille → quantité, l'outil du matin pour la cuisine, remplace le tri des enveloppes), allergies mises en évidence. Exports : CSV (`Blob` client, aucune route dédiée) et PDF brandé du rapport (`GET /api/commandes/rapport-pdf?menuId=...`, `lib/pdf/RapportDocument.tsx`).

## Ce qui reste à faire (marqué `TODO Claude Code` dans le code)

1. ~~**Upload de photos**~~ FAIT 2026-08-07 — jusqu'à 3 photos par repas (principale + 2), stockage disque local (`PHOTOS_DIR`), pas de service externe.
2. ~~**Exception par institution**~~ RETIRÉ 2026-08-07 — n'avait plus de sens dès qu'un menu appartient à une seule institution (FK directe, protection structurelle).
3. ~~**Duplication de menu**~~ FAIT 2026-08-07 — `POST /api/menus/[id]/dupliquer`, bouton « Dupliquer » sur chaque ligne de la liste des menus.
4. ~~**Gestion complète des écoles**~~ FAIT 2026-08-07 — renommé Institutions, fiche complète (adresse, coordonnées, personne contact, logo, notes, dates, actif/inactif), suppression protégée par usage.
5. **Notifications UI** — les erreurs utilisent `alert()`/messages en ligne en attendant une vraie composante de notification.
6. **Auth admin** — écran de connexion ajouté (`/login`, identifiants `admin`/`admin` pour l'instant — voir `DEPLOIEMENT-VPS.md`), volontairement simple pour les démos. À durcir avant une mise en ligne définitive (mot de passe fort, hachage plutôt que comparaison en clair, éventuellement plusieurs comptes).
7. **Aucune notification courriel** — ni confirmation au parent après une commande, ni alerte à l'équipe pour une nouvelle commande. Demande une décision d'infrastructure (SMTP ou service tiers type Resend/Postmark) avant d'être construite.
8. **Aucune récupération de mot de passe parent** — un compte ouvert directement par l'admin (mot de passe aléatoire, voir `POST /api/admin/parents`) ne peut donc jamais devenir un vrai compte connectable sans ce mécanisme.
9. **Paiement en ligne** — délibérément hors scope pour cette version (voir plus haut) ; le mode de paiement est capturé mais le paiement reste géré hors ligne comme avant.

## En ligne (temporaire)

**https://pommeverte.charlesgroleau.com** — hébergé sur le VPS OVH de Charles,
Postgres natif, protégé par mot de passe. Voir `DEPLOIEMENT-VPS.md` pour le
détail complet (infrastructure, déploiement, pièges appris).

## Décision à trancher avec Charles

`DELETE /api/repas/[id]` bloque la suppression d'un repas déjà utilisé dans
un menu (409). L'alternative — autoriser la suppression et laisser les
journées orphelines avec leur `nomOverride` figé — est un choix produit
valide aussi. Voir le commentaire dans `app/api/repas/[id]/route.ts`.
