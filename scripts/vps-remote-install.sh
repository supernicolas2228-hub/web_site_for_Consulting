#!/usr/bin/env bash
# Runs on the VPS after sell-is-life-deploy.tgz is uploaded to $ARCHIVE.
# Env: DEST (app dir), PM2_NAME, optional ARCHIVE (default ~/sell-is-life-deploy.tgz), optional PORT (default 3000).

set -euo pipefail

DEST="${DEST:?}"
PM2_NAME="${PM2_NAME:?}"
ARCHIVE="${ARCHIVE:-$HOME/sell-is-life-deploy.tgz}"
ARCHIVE="${ARCHIVE/#\~/$HOME}"
PORT="${PORT:-3000}"

mkdir -p "$DEST"
cd "$DEST"

if [ -f .env ]; then
  cp -a .env /tmp/sil-deploy-env.bak
fi

find . -mindepth 1 -maxdepth 1 ! -name .env -exec rm -rf {} +

tar -xzf "$ARCHIVE"
rm -f "$ARCHIVE"

if [ -f /tmp/sil-deploy-env.bak ]; then
  mv -f /tmp/sil-deploy-env.bak .env
fi

if [ ! -f .env ] && [ -f .env.example ]; then
  cp -a .env.example .env
  echo "vps-remote-install: создан .env из .env.example — задайте ADMIN_PASSWORD и NEXT_PUBLIC_SITE_URL" >&2
fi

# .env с Windows (CRLF) ломает «source .env» в bash — убираем \r
normalize_env_file() {
  if [ -f .env ]; then
    tr -d '\r' < .env > .env.__lf && mv .env.__lf .env
  fi
}
normalize_env_file

load_deploy_env() {
  set -a
  if [ -f .env ]; then
    # shellcheck disable=SC1091
    . ./.env
  fi
  set +a
}

load_deploy_env
mkdir -p data

unset NODE_ENV
npm ci
export NODE_ENV=production

npm run build

load_deploy_env
export PORT="${PORT:-3000}"

if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME" --update-env
else
  pm2 start npm --name "$PM2_NAME" --cwd "$DEST" -- start
fi

pm2 save 2>/dev/null || true

# Публичный сайт: при активном UFW — 22/80/443 с любого IP; предупреждение при nginx allow <IP> на сайте.
# Скрипт: scripts/vps-ensure-public-ingress.sh (копия в /tmp при деплое).
_ingress_ensure() {
  local p
  for p in /tmp/vps-ensure-public-ingress.sh \
    "$(cd "$(dirname "${BASH_SOURCE[0]:?}")" && pwd)/vps-ensure-public-ingress.sh"; do
    if [ -f "$p" ]; then
      bash "$p" || true
      if [ "$p" = "/tmp/vps-ensure-public-ingress.sh" ]; then
        rm -f /tmp/vps-ensure-public-ingress.sh
      fi
      return 0
    fi
  done
  return 0
}
_ingress_ensure
unset -f _ingress_ensure
