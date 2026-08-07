#!/usr/bin/env bash
#
# Déploiement de Pomme Verte (admin Repas & Menus) sur le VPS OVH.
#
# Principe « béton » (même recette que Santé/NHCG) : on envoie le CODE SOURCE
# sur le VPS et on CONSTRUIT là-bas (npm ci + prisma generate + next build).
# Le moteur Prisma généré est donc toujours celui de la bonne plateforme.
#
# La base de données (Postgres, /opt/pommeverte hors code) n'est JAMAIS touchée.
# En cas d'échec (build ou démarrage), retour arrière automatique.
#
# Usage :  bash deploy-vps.sh
#
set -euo pipefail

VPS="ubuntu@144.217.86.245"
RACINE_VPS="/opt/pommeverte"
PORT=3006
DOSSIER_SOURCE="$(cd "$(dirname "$0")" && pwd)"

echo "==> Source locale : $DOSSIER_SOURCE"
echo "==> Cible         : $VPS:$RACINE_VPS"

echo "==> 1/4 Envoi du code source (rsync)…"
rsync -az --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '*.tar.gz' \
  --exclude '.DS_Store' \
  --exclude 'data' \
  "$DOSSIER_SOURCE"/ "$VPS:$RACINE_VPS/build/"

echo "==> 2/4 Construction sur le VPS (npm ci + prisma generate + next build)…"
ssh "$VPS" 'set -euo pipefail
cd /opt/pommeverte/build

npm ci --no-audit --no-fund
npm run build

echo "   Assemblage du paquet autonome…"
rm -rf /opt/pommeverte/actuel.new
cp -a .next/standalone /opt/pommeverte/actuel.new
mkdir -p /opt/pommeverte/actuel.new/.next
cp -a .next/static /opt/pommeverte/actuel.new/.next/static
[ -d public ] && cp -a public /opt/pommeverte/actuel.new/public || true

# Garantir le moteur Prisma (le traceur next le rate parfois en standalone) :
rm -rf /opt/pommeverte/actuel.new/node_modules/.prisma /opt/pommeverte/actuel.new/node_modules/@prisma/client
mkdir -p /opt/pommeverte/actuel.new/node_modules/@prisma
cp -a node_modules/.prisma /opt/pommeverte/actuel.new/node_modules/.prisma
cp -a node_modules/@prisma/client /opt/pommeverte/actuel.new/node_modules/@prisma/client

echo "   Bascule (avec sauvegarde de la version précédente)…"
rm -rf /opt/pommeverte/actuel.prev
[ -d /opt/pommeverte/actuel ] && mv /opt/pommeverte/actuel /opt/pommeverte/actuel.prev
mv /opt/pommeverte/actuel.new /opt/pommeverte/actuel
'

echo "==> 3/4 Redémarrage du service…"
ssh "$VPS" 'sudo systemctl restart pommeverte.service; sleep 4'

echo "==> 4/4 Vérification…"
CODE=$(ssh "$VPS" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$PORT/ || echo 000")
if [ "$CODE" = "200" ] || [ "$CODE" = "307" ]; then
  echo "✅ Déploiement réussi — l'app répond (HTTP $CODE)."
  echo "   https://pommeverte.charlesgroleau.com"
else
  echo "⚠️  L'app ne répond pas correctement (HTTP $CODE) — RETOUR ARRIÈRE…"
  ssh "$VPS" 'set -e
    if [ -d /opt/pommeverte/actuel.prev ]; then
      rm -rf /opt/pommeverte/actuel.echec
      mv /opt/pommeverte/actuel /opt/pommeverte/actuel.echec
      mv /opt/pommeverte/actuel.prev /opt/pommeverte/actuel
      sudo systemctl restart pommeverte.service
      echo "   Version précédente restaurée."
    else
      echo "   Aucune version précédente à restaurer."
    fi'
  echo "❌ Déploiement annulé, version précédente remise en service."
  exit 1
fi
