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
npm run db:seed        # peuple les 8 écoles + quelques repas d'exemple
npm run dev
```

Ouvrir `http://localhost:3000` — redirige vers `/admin/menus`.

## Ce qui est déjà fonctionnel

- `prisma/schema.prisma` — modèle de données complet (Ecole, Repas, Menu, MenuEcole, MenuJournee)
- `lib/menu-logic.ts` — génération des journées, résolution override/repas, validation de complétude
- API : `GET/POST /api/repas`, `PATCH/DELETE /api/repas/[id]`
- API : `GET/POST /api/menus`, `PATCH /api/menus/[id]` (assignation repas + override par journée), `POST /api/menus/[id]/publish`
- Pages : `/admin/repas` (liste + création), `/admin/menus` (liste + publication par école), `/admin/menus/nouveau` (création), `/admin/menus/[id]` (montage journée par journée)

## Ce qui reste à faire (marqué `TODO Claude Code` dans le code)

1. **Upload de photos** — `photoUrl` existe dans le schéma mais n'est branché sur aucun stockage. Prévoir Supabase Storage ou équivalent.
2. **Exception par école (`seulementPourEcoles`)** — le champ existe et l'API le supporte (`PATCH .../[id]` avec `seulementPourEcoles`), mais l'interface de la page `/admin/menus/[id]` n'a pas encore le contrôle interactif pour le modifier (affichage en lecture seule pour l'instant).
3. **Duplication de menu** — décrite au §5 du briefing, non implémentée dans ce démarrage.
4. **Gestion complète des écoles** — seule une route de lecture existe (`GET /api/ecoles`). CRUD complet (logo, actif/non actif) = module suivant.
5. **Notifications UI** — les erreurs utilisent `alert()` en attendant une vraie composante de notification.
6. **Auth** — aucune protection applicative sur les routes `/admin/*` dans ce démarrage. Protégé pour l'instant par Basic Auth au niveau de Caddy (voir `DEPLOIEMENT-VPS.md`) le temps de la validation en ligne — une vraie authentification applicative reste à ajouter avant une mise en ligne définitive (l'authentification SMS est un bloc séparé).

## En ligne (temporaire)

**https://pommeverte.charlesgroleau.com** — hébergé sur le VPS OVH de Charles,
Postgres natif, protégé par mot de passe. Voir `DEPLOIEMENT-VPS.md` pour le
détail complet (infrastructure, déploiement, pièges appris).

## Décision à trancher avec Charles

`DELETE /api/repas/[id]` bloque la suppression d'un repas déjà utilisé dans
un menu (409). L'alternative — autoriser la suppression et laisser les
journées orphelines avec leur `nomOverride` figé — est un choix produit
valide aussi. Voir le commentaire dans `app/api/repas/[id]/route.ts`.
