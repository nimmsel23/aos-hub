#!/usr/bin/env bash
# door_data.sh - Data access layer for door operations
# Used by: doorctl CLI, Index Node API

set -euo pipefail

TASK_BIN="${TASK_BIN:-task}"

# Get all doors from Taskwarrior
# Output: JSON array of door objects (pending/completed/waiting; deleted excluded)
get_doors() {
  command -v "$TASK_BIN" >/dev/null 2>&1 || return 1
  command -v jq >/dev/null 2>&1 || return 1

  # Get all tasks with domino_door UDA, group by Door.
  # Avoid deleted tasks so counts remain useful for CLI dashboards.
  "$TASK_BIN" export 2>/dev/null | jq -r '
    map(select((.status // "") != "deleted"))
    | map(.door_key = (.domino_door // ""))
    | map(select(.door_key != ""))
    | group_by(.door_key)
    | map({
        name: .[0].door_key,
        count: length,
        done: map(select(.status == "completed")) | length,
        pending: map(select(.status == "pending")) | length,
        project: (.[0].project // ""),
        tags: (.[0].tags // []),
        due: (map(.due) | sort | .[0] // null),
        modified: (map(.modified) | sort | reverse | .[0] // null)
      })
    | .[]
  ' | jq -s '.'
}

# Get tasks for specific door
# Args: domino_door
# Output: JSON array of tasks (deleted excluded)
get_door_tasks() {
  local domino_door="$1"
  command -v "$TASK_BIN" >/dev/null 2>&1 || return 1
  command -v jq >/dev/null 2>&1 || return 1

  "$TASK_BIN" export 2>/dev/null | jq -c --arg domino_door "$domino_door" '
    map(select((.status // "") != "deleted"))
    | map(select(((.domino_door // "")) == $domino_door))
  '
}

# Get door metadata
# Args: domino_door
# Output: JSON object with door metadata
get_door_metadata() {
  local domino_door="$1"
  local tasks
  tasks=$(get_door_tasks "$domino_door")

  if [[ "$tasks" == "[]" || -z "$tasks" ]]; then
    echo "{}"
    return 1
  fi

  echo "$tasks" | jq -r '{
    name: (.[0].domino_door // ""),
    count: length,
    done: [.[] | select(.status == "completed")] | length,
    pending: [.[] | select(.status == "pending")] | length,
    project: (.[0].project // ""),
    tags: (.[0].tags // []),
    due: (map(.due) | sort | .[0] // null),
    modified: (map(.modified) | sort | reverse | .[0] // null)
  }'
}

# Get all pending hits (across all doors)
# Output: JSON array of tasks
get_all_hits() {
  command -v "$TASK_BIN" >/dev/null 2>&1 || return 1

  "$TASK_BIN" export +hit status:pending 2>/dev/null
}

# Get next hit (highest priority, soonest due)
# Args: [domino_door] (optional)
# Output: JSON array of top N tasks
get_next_hits() {
  local domino_door="${1:-}"
  local limit="${2:-3}"

  command -v "$TASK_BIN" >/dev/null 2>&1 || return 1

  if [[ -n "$domino_door" ]]; then
    "$TASK_BIN" export "domino_door:$domino_door" "(status:pending or status:waiting)" limit:"$limit" 2>/dev/null
  else
    "$TASK_BIN" export "(domino_door.not: or +door or +hit or +strike)" "(status:pending or status:waiting)" limit:"$limit" 2>/dev/null
  fi
}

# Mark task done
# Args: uuid_prefix
mark_hit_done() {
  local uuid_prefix="$1"
  command -v "$TASK_BIN" >/dev/null 2>&1 || return 1

  "$TASK_BIN" "$uuid_prefix" done 2>/dev/null
}

# Get door count
get_door_count() {
  get_doors | jq 'length'
}

# Check if door exists
# Args: domino_door
door_exists() {
  local domino_door="$1"
  local tasks
  tasks=$(get_door_tasks "$domino_door")

  [[ "$tasks" != "[]" && -n "$tasks" ]]
}
