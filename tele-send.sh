#!/usr/bin/env bash
# tele-send.sh - Telegram sender with optional chat id override
set -euo pipefail

CHAT_ID_DEFAULT="8442781308"
TOKEN_FILE="$HOME/.fitnessctx/fitness.env"

if [[ -f "$TOKEN_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$TOKEN_FILE"
fi
TOKEN="${TELEGRAM_TOKEN:-}"

if [[ -z "${TOKEN}" ]]; then
  echo "TELEGRAM_TOKEN not set (expected in $TOKEN_FILE)" >&2
  exit 1
fi

# Usage:
#   tele-send.sh "message"              -> uses default chat id
#   tele-send.sh 123456 "message ..."   -> override chat id

maybe_id="${1:-}"
if [[ "$maybe_id" =~ ^-?[0-9]+$ ]]; then
  CHAT_ID="$maybe_id"
  shift
else
  CHAT_ID="$CHAT_ID_DEFAULT"
fi

TEXT="$*"
if [[ -z "$TEXT" ]]; then
  echo "No text provided" >&2
  exit 1
fi

curl -sS -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
  -H 'Content-Type: application/json' \
  -d "{\"chat_id\":${CHAT_ID},\"text\":${TEXT@Q},\"disable_web_page_preview\":true}"
