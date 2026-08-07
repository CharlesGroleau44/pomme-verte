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

- `prisma/schema.prisma` — modèle de données complet (Institution, Repas, Menu, MenuInstitution, MenuJournee)
- `lib/menu-logic.ts` — génération des journées, résolution override/repas, validation de complétude
- API : `GET/POST /api/repas`, `PATCH/DELETE /api/repas/[id]`, `POST /api/repas/photos` (upload), `GET /api/photos/[filename]` (service)
- API : `GET/POST /api/institutions`, `PATCH/DELETE /api/institutions/[id]`
- API : `GET/POST /api/menus`, `PATCH /api/menus/[id]` (assignation repas + override par journée), `POST /api/menus/[id]/publish`
- Pages : `/admin/institutions` (liste + création + édition + actif/inactif), `/admin/repas` (liste + création + édition, jusqu'à 3 photos, association à des institutions précises), `/admin/menus` (liste + publication par institution), `/admin/menus/nouveau` (création), `/admin/menus/[id]` (montage journée par journée)

## Ce qui reste à faire (marqué `TODO Claude Code` dans le code)

1. ~~**Upload de photos**~~ FAIT 2026-08-07 — jusqu'à 3 photos par repas (principale + 2), stockage disque local (`PHOTOS_DIR`), pas de service externe.
2. **Exception par institution (`seulementPourInstitutions`)** — le champ existe et l'API le supporte (`PATCH .../[id]` avec `seulementPourInstitutions`), mais l'interface de la page `/admin/menus/[id]` n'a pas encore le contrôle interactif pour le modifier (affichage en lecture seule pour l'instant).
3. **Duplication de menu** — décrite au §5 du briefing, non implémentée dans ce démarrage.
4. ~~**Gestion complète des écoles**~~ FAIT 2026-08-07 — renommé Institutions, CRUD complet (`/admin/institutions` : création, édition, actif/inactif, suppression protégée par usage).
5. **Notifications UI** — les erreurs utilisent `alert()` en attendant une vraie composante de notification.
6. **Auth** — écran de connexion ajouté (`/login`, identifiants `admin`/`admin` pour l'instant — voir `DEPLOIEMENT-VPS.md`), volontairement simple pour les démos. À durcir avant une mise en ligne définitive (mot de passe fort, hachage plutôt que comparaison en clair, éventuellement plusieurs comptes — l'authentification SMS est un bloc séparé).

## En ligne (temporaire)

**https://pommeverte.charlesgroleau.com** — hébergé sur le VPS OVH de Charles,
Postgres natif, protégé par mot de passe. Voir `DEPLOIEMENT-VPS.md` pour le
détail complet (infrastructure, déploiement, pièges appris).

## Décision à trancher avec Charles

`DELETE /api/repas/[id]` bloque la suppression d'un repas déjà utilisé dans
un menu (409). L'alternative — autoriser la suppression et laisser les
journées orphelines avec leur `nomOverride` figé — est un choix produit
valide aussi. Voir le commentaire dans `app/api/repas/[id]/route.ts`.
