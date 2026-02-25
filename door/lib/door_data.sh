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

  # Get all tasks with door_name UDA, group by door.
  # Avoid deleted tasks so counts remain useful for CLI dashboards.
  "$TASK_BIN" export 2>/dev/null | jq -r '
    map(select((.status // "") != "deleted"))
    | map(select(.door_name != null and .door_name != ""))
    | group_by(.door_name)
    | map({
        name: .[0].door_name,
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
# Args: door_name
# Output: JSON array of tasks (deleted excluded)
get_door_tasks() {
  local door_name="$1"
  command -v "$TASK_BIN" >/dev/null 2>&1 || return 1
  command -v jq >/dev/null 2>&1 || return 1

  "$TASK_BIN" export 2>/dev/null | jq -c --arg door_name "$door_name" '
    map(select((.status // "") != "deleted"))
    | map(select((.door_name // "") == $door_name))
  '
}

# Get door metadata
# Args: door_name
# Output: JSON object with door metadata
get_door_metadata() {
  local door_name="$1"
  local tasks
  tasks=$(get_door_tasks "$door_name")

  if [[ "$tasks" == "[]" || -z "$tasks" ]]; then
    echo "{}"
    return 1
  fi

  echo "$tasks" | jq -r '{
    name: .[0].door_name,
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
# Args: [door_name] (optional)
# Output: JSON array of top N tasks
get_next_hits() {
  local door_name="${1:-}"
  local limit="${2:-3}"

  command -v "$TASK_BIN" >/dev/null 2>&1 || return 1

  if [[ -n "$door_name" ]]; then
    "$TASK_BIN" export door_name:"$door_name" status:pending limit:"$limit" 2>/dev/null
  else
    "$TASK_BIN" export +door status:pending limit:"$limit" 2>/dev/null
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
# Args: door_name
door_exists() {
  local door_name="$1"
  local tasks
  tasks=$(get_door_tasks "$door_name")

  [[ "$tasks" != "[]" && -n "$tasks" ]]
}
