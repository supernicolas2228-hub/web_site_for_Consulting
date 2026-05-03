#!/usr/bin/env bash
# Вызывается на сервере Beget после scp: sell-is-life-node.tgz и passenger-site.htaccess в $HOME
set -euo pipefail

PH="${HOME}/sanchaevkirill.ru/public_html"
APP="${PH}/app_runtime"
TGZ="${HOME}/sell-is-life-node.tgz"
HASF="${HOME}/passenger-site.htaccess"

if [[ ! -f "$TGZ" ]]; then
  echo "Missing $TGZ"
  exit 1
fi

mkdir -p "$APP" "$APP/data" "$APP/tmp"

BK=""
if [[ -f "$APP/data/site-events.jsonl" ]]; then
  BK="$(mktemp)"
  cp "$APP/data/site-events.jsonl" "$BK"
  echo "Backed up site-events.jsonl"
fi

tar -xzf "$TGZ" -C "$APP"

if [[ -n "$BK" ]]; then
  mv "$BK" "$APP/data/site-events.jsonl"
  echo "Restored site-events.jsonl"
fi

chmod -R u+rwX "$APP" 2>/dev/null || true

if [[ -f "$HASF" ]]; then
  install -m 0644 "$HASF" "${PH}/.htaccess"
  echo "Installed Passenger .htaccess -> ${PH}/.htaccess"
fi

# Убрать статику старого `next export` из корня public_html — иначе Apache отдаёт index.html вместо Node
rm -f "${PH}/index.html" "${PH}/404.html" "${PH}/robots.txt" "${PH}/sitemap.xml" 2>/dev/null || true
rm -rf "${PH}/_next" 2>/dev/null || true
echo "Cleared static-export leftovers in ${PH} (if any)"

touch "$APP/tmp/restart.txt"
echo "Passenger restart touched: $APP/tmp/restart.txt"
echo "=== Node app updated in $APP ==="
