#!/usr/bin/env bash
# Inject Firebase config into the messaging service worker at build time.
# Reads from the same VITE_FIREBASE_*_* env vars that Vite uses.
# Determines dev/prod from VITE_FIREBASE_ENV (defaults to "prod").

set -euo pipefail

SW_FILE="dist/firebase-messaging-sw.js"

if [ ! -f "$SW_FILE" ]; then
  echo "[inject-sw-config] No service worker found at $SW_FILE — skipping."
  exit 0
fi

ENV="${VITE_FIREBASE_ENV:-prod}"

if [ "$ENV" = "dev" ]; then
  PREFIX="VITE_FIREBASE_DEV"
else
  PREFIX="VITE_FIREBASE_PROD"
fi

get_var() { eval echo "\${${PREFIX}_${1}:-}"; }

API_KEY=$(get_var "API_KEY")
AUTH_DOMAIN=$(get_var "AUTH_DOMAIN")
PROJECT_ID=$(get_var "PROJECT_ID")
STORAGE_BUCKET=$(get_var "STORAGE_BUCKET")
MESSAGING_SENDER_ID=$(get_var "MESSAGING_SENDER_ID")
APP_ID=$(get_var "APP_ID")

sed -i.bak \
  -e "s|%%FIREBASE_API_KEY%%|${API_KEY}|g" \
  -e "s|%%FIREBASE_AUTH_DOMAIN%%|${AUTH_DOMAIN}|g" \
  -e "s|%%FIREBASE_PROJECT_ID%%|${PROJECT_ID}|g" \
  -e "s|%%FIREBASE_STORAGE_BUCKET%%|${STORAGE_BUCKET}|g" \
  -e "s|%%FIREBASE_MESSAGING_SENDER_ID%%|${MESSAGING_SENDER_ID}|g" \
  -e "s|%%FIREBASE_APP_ID%%|${APP_ID}|g" \
  "$SW_FILE"

rm -f "${SW_FILE}.bak"
echo "[inject-sw-config] Injected $ENV config into $SW_FILE"
