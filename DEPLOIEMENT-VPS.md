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

## Restes à faire

- **Sauvegarde de la base Postgres ET du dossier `data/photos/`** :
  contrairement à Santé/NHCG (SQLite, couvertes par
  `/usr/local/bin/sauvegarde-vps`), ni l'un ni l'autre n'est encore intégré —
  `/opt/pommeverte/sauvegardes/` est vide. À faire avant que ce module porte
  des données réelles de production (au minimum un `pg_dump` quotidien avec
  rotation + une copie du dossier photos, sur le modèle des autres apps).
- Tout ce que le README du projet liste déjà sous « Ce qui reste à faire »
  (exception par institution dans l'UI du montage de menu — le champ existe
  côté API, duplication de menu, notifications UI, vraie authentification
  applicative).
- Décider si cet hébergement `pommeverte.charlesgroleau.com` reste temporaire
  ou devient l'adresse définitive (domaine propre au traiteur, etc.).
- Phase 2 de la présentation de vente (commandes en ligne, paiement) — hors
  scope du travail actuel, qui couvre la Phase 1 (fondations : institutions,
  repas, menus, publication).
