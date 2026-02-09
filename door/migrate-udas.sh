#!/usr/bin/env bash
# migrate-udas.sh - Migrate old door UDAs to new schema
# Usage: ./migrate-udas.sh [--dry-run]

set -euo pipefail

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

if ((DRY_RUN)); then
  echo "🔍 DRY RUN - No changes will be made"
  echo
fi

# ═══════════════════════════════════════════════════════════════
# 1. Migrate door_name → door.name
# ═══════════════════════════════════════════════════════════════

echo "📦 Migrating door_name → door.name..."

task export | jq -r '.[] | select(.door_name) | .uuid' | while read -r uuid; do
  door_name=$(task "$uuid" export | jq -r '.[0].door_name')

  if ((DRY_RUN)); then
    echo "  Would migrate: $uuid → door.name:$door_name"
  else
    task "$uuid" modify door.name:"$door_name"
    # Remove old UDA (if you want to clean up)
    # task "$uuid" modify door_name:
  fi
done

# ═══════════════════════════════════════════════════════════════
# 2. Migrate phase tags → door.phase
# ═══════════════════════════════════════════════════════════════

echo "📦 Migrating phase tags → door.phase..."

for phase in potential plan production profit; do
  if ((DRY_RUN)); then
    count=$(task +$phase status:pending count)
    echo "  Would migrate: $count tasks with +$phase → door.phase:$phase"
  else
    task +$phase modify door.phase:$phase -$phase || true
  fi
done

# ═══════════════════════════════════════════════════════════════
# 3. Migrate type tags → door.type
# ═══════════════════════════════════════════════════════════════

echo "📦 Migrating type tags → door.type..."

for type in hit strike bigrock warstack door; do
  if ((DRY_RUN)); then
    count=$(task +$type status:pending count 2>/dev/null || echo "0")
    echo "  Would migrate: $count tasks with +$type → door.type:$type"
  else
    task +$type modify door.type:$type -$type || true
  fi
done

# ═══════════════════════════════════════════════════════════════
# 4. Infer domain from project
# ═══════════════════════════════════════════════════════════════

echo "📦 Inferring domain from project..."

for domain in body being balance business; do
  domain_upper=$(echo "$domain" | tr '[:lower:]' '[:upper:]')

  if ((DRY_RUN)); then
    count=$(task project.contains:"$domain_upper" status:pending count 2>/dev/null || echo "0")
    echo "  Would set: $count tasks with project:*$domain_upper* → door.domain:$domain"
  else
    task project.contains:"$domain_upper" modify door.domain:$domain || true
  fi
done

# ═══════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════

echo
echo "✅ Migration complete!"
echo

if ((DRY_RUN)); then
  echo "Run without --dry-run to apply changes"
else
  echo "Review with:"
  echo "  task doors              # All doors"
  echo "  task door.phase:production"
  echo "  task door.domain:business"
fi
