# Déploiement natif sur le VPS OVH — Pomme Verte (admin Repas & Menus)

> Hébergement **temporaire** demandé par Charles le temps de valider le module.
> Même VPS et même recette « béton » que Suivi Santé Couture / NHCG, mais avec
> **Postgres natif** (le schéma Prisma utilise des types propres à Postgres —
> tableaux, `Decimal`, `Date` — incompatibles avec SQLite).

## Où c'est installé

- VPS : `ubuntu@144.217.86.245` (OVH Beauharnois — le même que Santé/NHCG/Prologue…).
- Dossier : `/opt/pommeverte/`
  - `build/` — le code source envoyé par `deploy-vps.sh`, où se fait le `npm ci` + `next build`.
  - `actuel/` — le bundle Next.js standalone servi par le service (`server.js`, `.next/static`, `node_modules`…).
  - `data/photos/` — **photos de repas, stockage disque persistant** (jamais touché par un déploiement — `actuel` est entièrement remplacé à chaque bascule, ce dossier vit à côté). `PHOTOS_DIR` dans `pommeverte.env` pointe ici.
  - `sauvegardes/` — réservé (rien n'y est écrit pour l'instant — voir « Restes à faire »).
  - `pommeverte.env` — variables d'environnement (root, chmod 600 — secrets).
- **Port interne : 3006** (prochain disponible après Santé 3000, NHCG 3001, Prologue 3002, Épilogue 3003, OdooGo 3004, Foyer/Maison 3005).

## Base de données

**PostgreSQL 16 natif** (`apt install postgresql`, pas de Docker — cohérent avec la
philosophie « tout natif systemd+Caddy » du VPS pour les apps non-Odoo).

- N'écoute que sur `127.0.0.1:5432`, authentification `scram-sha-256`.
- Rôle `pommeverte`, base `pomme_verte` (propriétaire `pommeverte`).
- `DATABASE_URL` dans `pommeverte.env` (jamais dans le code, jamais commité).
- Schéma appliqué par `npx prisma db push` (pas de migrations formelles pour ce
  démarrage — à réévaluer si le schéma stabilise et que des données réelles
  s'accumulent : à ce moment, passer à `prisma migrate` pour un historique propre).
- Amorçage initial : `npx tsx prisma/seed.ts` — 8 institutions réelles + 5 repas
  de départ (voir `prisma/seed.ts`).

## Photos de repas

Jusqu'à 3 photos par repas (principale + 2), téléversées via
`POST /api/repas/photos` (multipart, JPEG/PNG/WebP, 8 Mo max) et servies par
`GET /api/photos/[filename]` (lit `PHOTOS_DIR`, protégé comme le reste de
l'app par `middleware.ts`). Stockage **disque local**, pas de service externe
(Supabase Storage, S3…) — cohérent avec la philosophie « tout sur le VPS de
Charles » des autres apps. `lib/photos.ts` centralise le dossier, les types
acceptés et la taille max.

## Le service (systemd, redémarrage auto)

`pommeverte.service` — le serveur Next.js (`node server.js`) sur `127.0.0.1:3006`.

```bash
sudo systemctl status pommeverte
sudo systemctl restart pommeverte
sudo journalctl -u pommeverte -n 50 --no-pager
```

Pas de minuterie/cron : ce module n'a pas (encore) de tâche de fond.

## En ligne

- **https://pommeverte.charlesgroleau.com** — HTTPS auto (Let's Encrypt via Caddy).
- DNS chez **CloudFlare**, zone `charlesgroleau.com`, compte
  `Coordination@pmeconforme.com`. Enregistrement A `pommeverte` → `144.217.86.245`,
  **nuage GRIS (DNS only)** obligatoire — sinon Caddy ne peut pas émettre le certificat.
- Bloc dans `/etc/caddy/Caddyfile` : `reverse_proxy 127.0.0.1:3006`.

## Écran de connexion applicatif

Le README du projet signalait (« Ce qui reste à faire », point 6) qu'aucune
authentification n'existait dans ce démarrage. Un premier écran de connexion a
été ajouté le 2026-08-07 (identifiants **`admin` / `admin`** pour l'instant,
délibérément simples pour les démos client) :

- `middleware.ts` protège **tout** le site (sauf `/login`, `/api/login` et les
  fichiers statiques) — redirection vers `/login` si le cookie de session est
  absent ou invalide.
- `lib/session.ts` signe le cookie `pv_session` par HMAC-SHA256 (Web Crypto,
  compatible Node **et** Edge — donc utilisable à la fois dans les routes API
  et dans `middleware.ts`, qui tourne en Edge runtime sous Next 14).
- Identifiants et secret dans `pommeverte.env` : `ADMIN_USER`, `ADMIN_PASSWORD`,
  `SESSION_SECRET`.
- **La protection Basic Auth de Caddy a été retirée** le même jour — la garder
  en plus de l'écran de connexion applicatif aurait affiché le popup gris natif
  du navigateur AVANT la page brandée, ce qui allait à l'encontre de l'effet
  recherché pour la démo cliente.

**Toujours pas une authentification de production** — `admin`/`admin` est un
mot de passe de démonstration. À durcir avant toute mise en ligne définitive
(mot de passe fort, éventuellement plusieurs comptes, hachage du mot de passe
plutôt qu'une comparaison en clair contre l'env).

## Mise à jour (nouvelle version)

**La méthode officielle : `bash deploy-vps.sh`** depuis le dossier du projet sur
le Mac. Le script envoie le code source, construit SUR le VPS (`npm ci` +
`prisma generate` + `next build`, donc le moteur Prisma est garanti pour la
bonne plateforme), copie explicitement `node_modules/.prisma` et
`node_modules/@prisma/client` dans le bundle standalone (le traceur de fichiers
de Next rate parfois le moteur Prisma en mode standalone), bascule avec
conservation de la version précédente et **revient en arrière automatiquement**
si l'app ne répond plus. Ne touche jamais la base Postgres.

Un changement de schéma Prisma nécessite un geste manuel après le déploiement
(pas encore scripté) :

```bash
ssh ubuntu@144.217.86.245
cd /opt/pommeverte/build
export DATABASE_URL=$(sudo grep -oP '(?<=^DATABASE_URL=").*(?="$)' /opt/pommeverte/pommeverte.env)
npx prisma db push --skip-generate
```

## Piège appris (build échoue sans DATABASE_URL)

Next.js tente de **prérendre statiquement** au build toute route API `GET` qui
n'utilise aucune fonction dynamique (cookies, headers, `searchParams`) — même
sous `app/api/`. Comme ces routes interrogent Prisma, le build échouait sans
base de données accessible au moment du build. Fix : `export const dynamic =
'force-dynamic'` sur les routes de collection (`/api/institutions`,
`/api/menus`, `/api/repas`) — elles doivent de toute façon toujours servir des
données fraîches, jamais du contenu figé au build.

## Renommage École → Institution (2026-08-07)

Le modèle de données a été renommé au complet — `Ecole`→`Institution`,
`MenuEcole`→`MenuInstitution`, `ecoleId`→`institutionId`,
`seulementPourEcoles`→`seulementPourInstitutions`, route `/api/ecoles` →
`/api/institutions` (avec CRUD complet cette fois, y compris édition et
suppression protégée par usage). Décision prise en confirmant avec la
présentation de vente du projet (`Institutions : écoles, RPA ou tout autre
établissement — nom, logo, statut actif`) — Écoles et Institutions auraient
été le même concept en double, un vrai risque de confusion. Migration faite
par `prisma db push --accept-data-loss` (confirmé par Charles) : les 8 lignes
existantes ont été recréées à l'identique par le seed, aucun menu n'existait
encore donc rien d'autre n'a été perdu.

Un `Repas` peut maintenant être associé à des institutions précises (relation
n:n implicite Prisma `Repas.institutions` / `Institution.repas`) — **liste
vide = disponible pour toutes**, même convention que
`seulementPourInstitutions` sur les journées de menu.

## Système de design (2026-08-07)

Refonte visuelle demandée par Charles pour une interface « très haut de
gamme » comparable aux meilleures applications SaaS, avec un tableau de bord
par section.

**Palette et typographie** — reprises telles quelles de
`presentation-marketing-pomme-verte.html` (la présentation de vente du
projet), pas inventées : crème `#FBFBF6` / encre `#16210F` / ramp vert
séquentiel `apple-light #C7DE8E` → `apple-mid #8FC24A` → `apple-deep #3B8C47`
→ `leaf #1B4A1E` → `leaf-deep #123512`, police **Nunito** (Google Fonts).
Déclarées dans `tailwind.config.js` (`colors.pomme`, `colors.status`) —
jamais de couleur Tailwind par défaut (`emerald-`, `gray-`, etc.) ailleurs
dans `app/`.

**Statuts** (`colors.status`) — validés avec le script du skill dataviz
(`node scripts/validate_palette.js`) : `good` (vert marque) et `critical`
(rouge) échouent le test d'adjacence CVD (paire rouge/vert classique,
inhérente à presque tout système de statut) — mitigé en accompagnant
**toujours** la couleur d'un texte (« Active »/« Inactive », jamais une
pastille seule). `warning` (ambre) est bien distinct des deux autres.

**Navigation** — sidebar fixe à gauche en bureau/tablette (`Sidebar.tsx`,
verte foncée `leaf-deep`), remplacée sous `md` (768px) par une barre
d'onglets fixe en bas (`NavMobile.tsx`) + en-tête compact (`TopBarMobile.tsx`)
— même patron que les apps mobiles de Charles (NHCG, Couture). Icônes
maison SVG trait (`Icones.tsx`), certaines reprises directement de la
présentation de vente pour la continuité visuelle.

**Tableaux de bord** (`app/admin/dashboard/`) — un par section
(Institutions/Repas/Menus), au-dessus de la liste existante :
- `StatTile.tsx` — chiffres proportionnels (jamais `tabular-nums`, réservé
  aux colonnes alignées).
- `TendanceHebdo.tsx` — graphique à colonnes SVG maison des entrées par
  semaine (8 dernières semaines glissantes), suit le skill dataviz interne :
  colonnes ≤24px à extrémité arrondie 4px/base carrée, gridlines hairline,
  **une seule teinte donc pas de légende**, étiquette directe seulement sur
  la dernière colonne, infobulle au survol **et au focus clavier** (chaque
  colonne porte `role="img"` + `aria-label` — accessibilité ET point
  d'ancrage fiable pour les tests). Aucune dépendance de charting ajoutée
  (patron « maison » cohérent avec `CourbeMesure` chez NHCG).
- `EntreesRecentes.tsx` — les 5 dernières entrées avec horodatage relatif
  (`lib/dashboard.ts` : `relatif()`, `semainesRecentes()`).

**Formulaires** — `ChampPhoto.tsx` (upload photo/logo) et `ChampsFiche.tsx`
(fiche institution) restylés aux mêmes tokens; grilles responsives
(`grid-cols-1 sm:grid-cols-3` etc.) pour un empilement propre en mobile.

**Vérifié aux trois formats** (bureau, tablette 768px, mobile 375px) via le
navigateur `Claude_Browser` (son `resize_window` gère un vrai changement de
viewport — **`mcp__claude-in-chrome__resize_window` n'a pas fonctionné dans
cette session** : la commande répond succès mais `window.innerWidth` ne
bouge jamais, confirmé en rechargeant après coup). Un correctif est né de
cette vérification : les libellés de stat tiles trop longs (« Ajoutées ce
mois-ci », « Restreints à des institutions ») se faisaient tronquer à
768px — raccourcis (« Ce mois-ci », « Restreints » + sous-texte).

## Jusqu'à 2 repas par jour + espace public /menus (2026-08-07)

Après un premier test réel de montage de menu, deux lacunes concrètes ont mené
à une deuxième restructuration :

**Modèle de données** — `MenuJournee.repasId` (un seul repas, pas de prix
éditable) remplacé par un modèle enfant `MenuJourneeSelection` : une journée
porte 0 à 2 sélections (au moins 1 requise pour que le menu soit complet),
chacune avec ses propres overrides nom/description/**3 prix** (avant, seuls
nom/description/photo étaient overridables — les prix ne l'étaient pas du
tout, ni même affichés au montage). `@@unique([journeeId, repasId])` empêche
de choisir deux fois le même repas la même journée; supprimer une sélection
le rend à nouveau sélectionnable. Migration confirmée avec Charles
(`--accept-data-loss` — 9 sélections de test perdues, aucune donnée réelle).

Nouvelles routes : `POST /api/journees/[journeeId]/selections`,
`PATCH`/`DELETE /api/selections/[selectionId]`. `/api/menus/[id]` PATCH ne
gère plus que `seulementPourInstitutions`.

**Espace public `/menus`** — la maquette existante du traiteur
(`traiteurlapommeverte.com/votre-ecole/`) liste chaque institution avec son
logo et un bouton vers son menu; on reproduit ce patron aux couleurs de la
nouvelle plateforme, en Server Components Next.js (accès direct à Prisma,
pas de détour par l'API) :
- `/menus` — toutes les institutions actives, grosses cartes logo + bouton.
- `/menus/[institutionId]` — les menus **publiés** (`MenuInstitution.publie
  = true`) de cette institution seulement; un brouillon n'y apparaît jamais.
- `/menus/[institutionId]/[menuId]` — le menu jour par jour en **lecture
  seule**, filtré par `seulementPourInstitutions`. Vérifie que le lien
  menu↔institution est bien publié avant d'afficher quoi que ce soit
  (`notFound()` sinon) — un menuId deviné ne fuite rien.

Le lien menu↔institution était alors une relation n:n (`MenuInstitution`,
`publie` par institution) — voir plus bas (2026-08-07) pour son remplacement
par une FK unique.

`middleware.ts` exclut maintenant `/menus` (l'espace public) et
`/api/photos` (logos et photos de repas, affichés sur ces pages publiques et
donc plus protégeables par la connexion admin) de l'authentification
obligatoire. Bouton **« Se connecter »** ajouté dans l'en-tête public
(coin supérieur droit) — sert l'admin pour l'instant, prévu pour accueillir
aussi les futurs comptes-parents (Phase 2, commandes en ligne).

**Toujours sur `pommeverte.charlesgroleau.com`, pas encore sur
`menus.traiteurlapommeverte.com`** (le domaine visé par la présentation de
vente) — ce dernier appartient au client et nécessite un accès DNS que
Charles n'a pas encore donné. À migrer quand ce sera confirmé.

## 2026-08-07 — Un menu, une seule institution (+ duplication, dépublication automatique)

**Pourquoi** — le lien n:n `MenuInstitution` permettait en théorie un menu
partagé par plusieurs institutions, mais l'usage réel n'en avait pas besoin
et rendait le montage plus confus (à qui s'applique quoi ?). Charles a
demandé une protection structurelle : un menu appartient à **une seule**
institution, point. Servir le même contenu ailleurs se fait en dupliquant.

**Modèle de données** — `Menu.institutionId` est maintenant une **FK directe
requise** (`onDelete: Cascade`), plus une relation n:n. `MenuInstitution` et
`MenuJournee.seulementPourInstitutions` sont supprimés — le second n'avait
plus de sens dès qu'un menu ne peut être lié qu'à une institution.
`Menu.dateLimiteCommande` est aussi passée de facultative à **obligatoire**
(`DateTime @db.Date`, sans `?`) : elle gouverne maintenant la dépublication
automatique (voir plus bas), un menu sans date limite ne pourrait jamais se
dépublier tout seul.

**Dépublication automatique à la date limite, 23h59** — plutôt qu'une tâche
planifiée (aucune infra cron/minuterie dans cette app), l'état visible est
**calculé à la lecture** : `estActivementPublie(menu)` dans
`lib/menu-logic.ts` renvoie `publie && new Date() <= finDeJournee(dateLimiteCommande)`.
`publie` reste l'intention de l'admin en base; c'est cet état calculé, pas
le booléen brut, qui gouverne tout ce qui est montré aux parents (pages
publiques) et qui bloque une republication tardive (`POST
/api/menus/[id]/publish` renvoie 422 si la date limite est déjà passée).
Avantage sur un cron : toujours correct même après un redémarrage serveur,
aucun service supplémentaire à surveiller.

**Duplication** — nouvelle route `POST /api/menus/[id]/dupliquer`
(`{institutionId}`) : copie complète du menu (journées + sélections, avec
leurs overrides nom/description/3 prix) vers une autre institution. Le
duplicata part toujours **non publié**, peu importe l'état de l'original.
UI : bouton « Dupliquer » sur chaque ligne de la liste des menus, ouvre un
petit sélecteur d'institution inline.

**UI admin** — le sélecteur d'institution à la création d'un menu est passé
de chips multi-sélection à **sélection unique**. La liste des menus
remplace les anciens badges de publication par institution par **un seul
gros bouton** : vert « PUBLIÉ » / rouge « NON PUBLIÉ » (couleur basée sur
`estActivementPublie`, pas sur le booléen brut — un menu publié mais
expiré affiche NON PUBLIÉ avec un avertissement explicite plutôt que de
laisser croire qu'il est encore commandable). La section « Applique à » du
montage jour par jour a disparu (n'avait plus de sens à institution unique).

**Migration** — le seul menu de test en base (lié à Boisé-Fabi via
l'ancienne table) a été reporté manuellement vers la nouvelle colonne
`institutionId` avant le `prisma db push --accept-data-loss`, pour ne pas le
perdre. Confirmé avec Charles avant exécution. Aucune perte de donnée réelle
(le menu de test et ses sélections ont survécu).

## 2026-08-07 — PDF par menu, commandes en ligne (compte + invité), console de traitement

**PDF brandé par menu** — nouvelle dépendance `@react-pdf/renderer` (+ `sharp`
pour redimensionner les photos avant de les embarquer : sans ça, un menu de
10 photos produisait un PDF de 15-20 Mo, réduit à ~50 Ko). `GET
/api/menus/[id]/pdf` reconstruit le PDF à la demande (pas de fichier stocké
— toujours à jour si le menu change après publication) : le menu jour par
jour, PLUS un coupon-réponse imprimable calqué sur le vrai formulaire papier
actuel du traiteur (`NDL21.1.pdf`, fourni par Charles) — mêmes champs :
cases à cocher repas/taille par journée en colonnes par semaine,
Quantité/Crédit/Total, mode de paiement, information élève (niveau,
allergies), information parent. Accessible sans connexion si le menu est
activement publié (même règle que la page web), toujours accessible à
l'admin pour prévisualiser un brouillon. Police Nunito embarquée (fichiers
statiques dans `public/fonts/`, comme pour l'artifact de démo).

**Commandes en ligne** — Charles a choisi (1) pas de paiement en ligne pour
cette version (le mode de paiement est capturé, l'encaissement reste hors
ligne comme avant) et (2) compte parent dès maintenant, complété ensuite par
un mode invité. Nouveaux modèles : `CompteParent` (courriel/mot de passe
scrypt, jamais le même secret ni le même cookie que l'admin — voir
`lib/parent-session.ts`, cookie `pv_parent`), `Enfant` (rattaché à une
institution précise, niveau, allergies), `Commande`
(`@@unique([enfantId, menuId])` — une seule par enfant par menu, on la
MODIFIE en resoumettant plutôt que d'en créer une seconde, comme le
permettait déjà le coupon papier), `LigneCommande` (un choix par journée).
- **Parcours connecté** : `/parent/inscription`, `/parent/connexion`,
  `/parent/compte` (gérer les enfants, historique, annulation). Le
  formulaire de commande sur `/menus/[institutionId]/[menuId]` précharge la
  commande existante s'il y en a une pour l'enfant sélectionné.
- **Parcours invité** : le formulaire complet (élève + parent + paiement)
  se remplit en même temps que le choix des repas, sans compte. Un
  `CompteParent`/`Enfant` est créé (ou retrouvé par courriel) en coulisse
  avec un mot de passe aléatoire inutilisable — l'invité ne peut jamais se
  connecter avec, seulement soumettre une nouvelle commande invité.
- Validation et écriture partagées entre les deux routes
  (`POST /api/parent/commandes` et `POST /api/parent/commandes-invite`) via
  `lib/commandes.ts` : le menu doit être activement publié, chaque journée/
  sélection soumise doit vraiment appartenir à ce menu.
- `middleware.ts` exclut maintenant `/parent` et `/api/parent` de
  l'authentification admin — monde totalement séparé, sa propre vérification
  de session dans chaque route/page.

**Console de traitement des commandes** — `/admin/commandes` (nouvel onglet
de navigation) : stat tiles (commandes, repas, revenu estimé, non payé),
filtre par institution et par menu, statut **PAYÉ/NON PAYÉ** par commande
(`Commande.paye`/`payeLe`, `PATCH /api/commandes/[id]`), **rapport de
préparation** — vue agrégée par journée → plat → taille → quantité,
construite pour remplacer le tri manuel des enveloppes le matin en cuisine.
Allergies mises en évidence partout (liste et rapport). Exports : CSV
(généré côté client depuis les commandes déjà chargées, aucune route
dédiée) et PDF brandé du rapport (`GET
/api/commandes/rapport-pdf?menuId=...`, `lib/pdf/RapportDocument.tsx`,
même infra PDF que le menu).

**Piège rencontré** : le format de date `@db.Date` (minuit UTC) s'affichait
correctement partout tant que le rendu était server-side (le VPS tourne en
`Etc/UTC`), mais un composant CLIENT (`'use client'`) qui fait
`new Date(iso).getDate()` recule d'un jour dans le fuseau horaire du
navigateur — et tous les vrais parents sont au Québec (UTC-4/-5). Repéré en
testant le nouveau formulaire de commande (jour affiché différent du jour
réel). Fix : `jourDuMoisUTC()` dans `lib/menu-logic.ts` (utilise
`getUTCDate()`), appliqué aux 3 endroits concernés
(`FormulaireCommande.tsx`, `admin/commandes/page.tsx`,
`admin/menus/[id]/page.tsx`) + `timeZone: 'UTC'` sur le `toLocaleDateString`
de la liste des menus admin. Réflexe à garder : toute nouvelle date-jour
affichée dans un composant client doit passer par cette fonction, jamais
`new Date(iso).getDate()` directement.

## Restes à faire

- **Sauvegarde de la base Postgres ET du dossier `data/photos/`** :
  contrairement à Santé/NHCG (SQLite, couvertes par
  `/usr/local/bin/sauvegarde-vps`), ni l'un ni l'autre n'est encore intégré —
  `/opt/pommeverte/sauvegardes/` est vide. À faire avant que ce module porte
  des données réelles de production (au minimum un `pg_dump` quotidien avec
  rotation + une copie du dossier photos, sur le modèle des autres apps).
- Tout ce que le README du projet liste déjà sous « Ce qui reste à faire »
  (notifications UI au lieu de `alert()`, vraie authentification applicative).
- Décider si cet hébergement `pommeverte.charlesgroleau.com` reste temporaire
  ou devient l'adresse définitive (domaine propre au traiteur, etc.).
- Phase 2 de la présentation de vente : commandes en ligne FAIT 2026-08-07
  (compte parent + invité, voir plus haut) ; paiement en ligne reste hors
  scope (décision explicite de Charles pour cette version).
- Notifications courriel (confirmation de commande au parent, alerte
  nouvelle commande à l'équipe) — pas encore construites, demandent une
  décision d'infrastructure (SMTP ou service tiers).
- Récupération de mot de passe parent — sans ça, un compte créé en mode
  invité ne peut jamais devenir un vrai compte connectable.
