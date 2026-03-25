#!/usr/bin/env zsh
set -euo pipefail

# User-side Core4 TUI.
# Contract for future code work:
# - `core4` is the preferred command for humans.
# - `core4ctx` is the compatibility executable that implements the user TUI.
# - `core4ctl` stays the engine/system CLI underneath.
# - Methodology/docs belong in `aos-hub/CORE4.md`, not duplicated here.
# - Keep this file focused on user interaction, not backend ontology.

ROOT_DIR="${AOS_HUB_DIR:-$HOME/aos-hub}"
CORE4CTL_BIN="${CORE4CTL_BIN:-$ROOT_DIR/core4/cli/core4ctl}"
PWACTX_BIN="${PWACTX_BIN:-$HOME/.dotfiles/bin/pwactx}"
CORE4_APP="core4"

# Source shared library
CTX_NAME="core4ctx"
CTX_DEFAULT_SERVICE="aos-core4ctx.service"
CTX_DEFAULT_URL="http://127.0.0.1:8788/"

_lib="${AOSCTX_LIB:-${0:A:h}/aosctx-lib.zsh}"
[[ -f "$_lib" ]] && source "$_lib" || { echo "[core4ctx] aosctx-lib.zsh not found at $_lib" >&2; exit 1; }

CORE4CTL_BIN="$(resolve_bin "$CORE4CTL_BIN" core4ctl)" || die "core4ctl not found"
PWACTX_BIN="$(resolve_bin "$PWACTX_BIN" pwactx)" || die "pwactx not found"

core4ctl() {
  "$CORE4CTL_BIN" "$@"
}

core4pwa() {
  "$PWACTX_BIN" "$CORE4_APP" "$@"
}

current_domain() {
  core4ctl current-domain 2>/dev/null || true
}

runtime_status_text() {
  core4pwa status 2>/dev/null || true
}

dashboard_json() {
  have_cmd jq || return 1
  core4ctl --json dashboard 2>/dev/null
}

render_overview() {
  local cur
  cur="$(current_domain)"

  title "Core4 Context — The 4 Domains"
  printf "Time:           %s\n" "$(date '+%Y-%m-%d %H:%M:%S %Z')"
  printf "Current Domain: %s\n" "${cur:-<none>}"
  render_runtime_summary
}

render_json_snapshot() {
  local json="${1:?json}"
  local body_score
  local being_score
  local balance_score
  local business_score

  body_score="$(printf "%s" "$json" | jq -r '.scores.body // "N/A"' 2>/dev/null || echo "N/A")"
  being_score="$(printf "%s" "$json" | jq -r '.scores.being // "N/A"' 2>/dev/null || echo "N/A")"
  balance_score="$(printf "%s" "$json" | jq -r '.scores.balance // "N/A"' 2>/dev/null || echo "N/A")"
  business_score="$(printf "%s" "$json" | jq -r '.scores.business // "N/A"' 2>/dev/null || echo "N/A")"

  echo
  title "Domain Scores"
  printf "BODY:     %s (Strength, Training, Recovery, Genetics)\n" "$body_score"
  printf "BEING:    %s (Meditation, Practice, Integration, Philosophy)\n" "$being_score"
  printf "BALANCE:  %s (Partner, Posterity, Social, Sacred Space)\n" "$balance_score"
  printf "BUSINESS: %s (Authority, Monetization, Teaching, Platform)\n" "$business_score"

  echo
  title "BODY Domain"
  printf "%s\n" "$(printf "%s" "$json" | jq -r '.domains.body.summary // "No Body data"' 2>/dev/null || echo "No Body data")"

  echo
  title "BEING Domain"
  printf "%s\n" "$(printf "%s" "$json" | jq -r '.domains.being.summary // "No Being data"' 2>/dev/null || echo "No Being data")"

  echo
  title "BALANCE Domain"
  printf "%s\n" "$(printf "%s" "$json" | jq -r '.domains.balance.summary // "No Balance data"' 2>/dev/null || echo "No Balance data")"

  echo
  title "BUSINESS Domain"
  printf "%s\n" "$(printf "%s" "$json" | jq -r '.domains.business.summary // "No Business data"' 2>/dev/null || echo "No Business data")"

  echo
  title "Core4 Philosophy"
  echo "BODY     = Physical Mastery (Training, Fuel, Recovery, Genetic Risk)"
  echo "BEING    = Inner Mastery (Meditation, Practice, Philosophy, Integration)"
  echo "BALANCE  = Relational Mastery (Partner, Posterity, Social, Sacred)"
  echo "BUSINESS = Financial Mastery (Authority, Monetization, Teaching, Platform)"
  echo ""
  echo "DOMINION = Simultaneous mastery of all 4 domains"
}

render_snapshot() {
  local json=""

  clear_screen
  render_overview
  json="$(dashboard_json || true)"

  if [[ -n "$json" ]]; then
    render_json_snapshot "$json"
  else
    echo
    title "Snapshot"
    echo "JSON dashboard unavailable. Falling back to core4ctl dashboard."
    echo
    core4ctl dashboard || true
  fi

  if can_prompt; then
    echo
    title "Actions"
    echo "[1] BODY Domain      [2] BEING Domain     [3] BALANCE Domain"
    echo "[4] BUSINESS Domain  [5] All Scores       [6] Current Domain"
    echo "[7] Chapters         [8] PWA status       [9] Open PWA"
    echo "[a] Log Habit        [s] Start PWA        [R] Restart PWA"
    echo "[x] Stop PWA         [l] Logs             [q] Quit"
  fi
}

set_current_domain_interactive() {
  local cur
  local next

  cur="$(current_domain)"
  clear_screen
  title "Current Domain"
  printf "Current Domain: %s\n" "${cur:-<none>}"
  echo "Enter a domain name (BODY/BEING/BALANCE/BUSINESS), or type clear to unset it."
  next="$(prompt_with_default "Domain" "$cur" || true)"

  [[ -n "$next" ]] || return 0
  if [[ "$next" == "clear" || "$next" == "-" ]]; then
    core4ctl current-domain clear
  else
    core4ctl current-domain "$next"
  fi

  echo
  pause_screen
}

domain_wizard() {
  local domain="${1:-}"
  local cur=""

  if [[ -z "$domain" ]]; then
    cur="$(current_domain)"
    domain="$(prompt_with_default "Domain (BODY/BEING/BALANCE/BUSINESS)" "$cur" || true)"
  fi

  [[ -n "$domain" ]] || return 0
  core4ctl current-domain "$domain" >/dev/null 2>&1 || true
  clear_screen
  title "Domain Editor — $domain"
  core4ctl edit "$domain"
  echo
  pause_screen
}

show_scores() {
  clear_screen
  title "Core4 Scores"
  echo "Current DOMINION status across all 4 domains."
  echo
  core4ctl scores || true

  echo
  pause_screen
}

log_habit_interactive() {
  local habit=""
  clear_screen
  title "Log Habit"
  printf "Habit (domain:description): "
  read -r habit || return 0
  [[ -n "${habit// }" ]] || return 0
  core4ctl log "$habit"
  echo
  pause_screen
}

show_help() {
  cat <<'EOF'
core4ctx

User-side Core4 domain dashboard.

Usage:
  core4ctx                     # interactive TUI
  core4ctx menu|dashboard|tui  # interactive TUI / snapshot
  core4ctx status              # combined Core4 + PWA status

User flows:
  core4ctx body|being|balance|business [args...]  # Domain focus
  core4ctx scores                                 # View all domain scores
  core4ctx log DOMAIN:DESCRIPTION                 # Log habit
  core4ctx chapters [args...]                     # local chapter reader
  core4ctx current-domain [name|clear]

Runtime:
  core4ctx open|start|stop|restart|logs|enable|disable

System-side engine remains: core4ctl
EOF
}

menu_loop() {
  local choice=""

  while true; do
    render_snapshot
    printf "Select: "
    read -r choice || return 0

    case "$choice" in
      ""|r)
        ;;
      1)
        run_screen "BODY Domain" core4ctl show body
        ;;
      2)
        run_screen "BEING Domain" core4ctl show being
        ;;
      3)
        run_screen "BALANCE Domain" core4ctl show balance
        ;;
      4)
        run_screen "BUSINESS Domain" core4ctl show business
        ;;
      5)
        show_scores
        ;;
      6)
        set_current_domain_interactive
        ;;
      7)
        clear_screen
        core4ctl chapters
        ;;
      8)
        run_screen "Core4 PWA Status" core4pwa status
        ;;
      9)
        run_screen "Core4 PWA URL" core4pwa open
        ;;
      a|A)
        log_habit_interactive
        ;;
      s)
        run_screen "Start Core4 PWA" core4pwa start
        ;;
      R)
        run_screen "Restart Core4 PWA" core4pwa restart
        ;;
      x|X)
        run_screen "Stop Core4 PWA" core4pwa stop
        ;;
      l|L)
        clear_screen
        title "Core4 PWA Logs"
        core4pwa logs
        ;;
      q|Q)
        return 0
        ;;
      *)
        ;;
    esac
  done
}

main() {
  local cmd="${1:-}"

  if [[ -z "$cmd" ]]; then
    if can_prompt; then
      cmd="menu"
    else
      cmd="status"
    fi
  else
    shift || true
  fi

  case "$cmd" in
    menu|dashboard|tui)
      if can_prompt; then
        menu_loop
      else
        render_snapshot
      fi
      ;;
    status)
      render_snapshot
      ;;
    body)
      if [[ "$#" -eq 0 ]]; then
        core4ctl show body
      else
        core4ctl body "$@"
      fi
      ;;
    being)
      if [[ "$#" -eq 0 ]]; then
        core4ctl show being
      else
        core4ctl being "$@"
      fi
      ;;
    balance)
      if [[ "$#" -eq 0 ]]; then
        core4ctl show balance
      else
        core4ctl balance "$@"
      fi
      ;;
    business)
      if [[ "$#" -eq 0 ]]; then
        core4ctl show business
      else
        core4ctl business "$@"
      fi
      ;;
    scores)
      if [[ "$#" -eq 0 ]]; then
        show_scores
      else
        core4ctl scores "$@"
      fi
      ;;
    log)
      core4ctl log "$@"
      ;;
    chapters|chapter)
      core4ctl chapters "$@"
      ;;
    current-domain)
      if [[ "$#" -eq 0 ]]; then
        core4ctl current-domain
      else
        core4ctl current-domain "$@"
      fi
      ;;
    open|start|stop|restart|logs|enable|disable)
      core4pwa "$cmd" "$@"
      ;;
    help|-h|--help)
      show_help
      ;;
    *)
      show_help >&2
      die "unknown command: $cmd"
      ;;
  esac
}

main "$@"
