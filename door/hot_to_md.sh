#!/usr/bin/env bash
# hot_to_md.sh
# Usage: hot_to_md.sh <UUID> "<DESCRIPTION>"

UUID="$1"
DESC="$2"

VAULT_ROOT="$HOME/AlphaOS-Vault/Door"
POTENTIAL_DIR="$VAULT_ROOT/1-Potential"

mkdir -p "$POTENTIAL_DIR"

# Slug aus der Beschreibung bauen
SLUG=$(printf '%s' "$DESC" \
  | tr '[:upper:]' '[:lower:]' \
  | sed 's/[^a-z0-9]\+/-/g;s/^-//;s/-$//')

STAMP=$(date +%Y-%m-%d)
FILE="$POTENTIAL_DIR/${STAMP}-${SLUG}.md"

if [ ! -f "$FILE" ]; then
  cat >"$FILE" <<EOF
# Hot Idea – $DESC

- [ ] HOT: $DESC

- Source: taskopen
- Created: $(date -Iseconds)

> Guardian of Ideas – captured via Taskwarrior (Alpha_OS Door).
EOF
fi

# Task mit file:// Annotation versehen (für spätere Sprünge)
task "$UUID" annotate "file://$FILE"

# Datei im Editor öffnen
"${EDITOR:-nvim}" "$FILE"
