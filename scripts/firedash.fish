#!/usr/bin/env fish
set -euo pipefail

set root (cd (dirname (status -f))/..; pwd)
set firectl "$root/game/fire/firectl"
set daily_service "aos-fire-daily.service"
set weekly_timer "aos-fire-weekly.timer"

function section -a title
  set_color --bold brcyan
  echo $title
  set_color normal
end

function divider
  set_color brblack
  echo "----------------------------------------"
  set_color normal
end

function http_status -a url
  if not command -v curl >/dev/null 2>&1
    echo "000"
    return 1
  end
  curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null
end

function ok_line -a label detail
  set_color brgreen
  echo "✔ $label: $detail"
  set_color normal
end

function warn_line -a label detail
  set_color bryellow
  echo "⚠ $label: $detail"
  set_color normal
end

function pwa_local_health
  set base ""
  if set -q AOS_INDEX_HEALTH_URL
    set base "$AOS_INDEX_HEALTH_URL"
  else
    set base "http://127.0.0.1:8799/health"
  end
  set base (string replace -r "/health$" "" "$base")
  set url "$base/pwa/fire/"
  set code (http_status "$url")
  if string match -rq '^(2|3)' -- "$code"
    ok_line "PWA local" "$code $url"
    return 0
  end
  warn_line "PWA local" "$code $url"
  return 1
end

function pwa_tailnet_health
  if not command -v tailscale >/dev/null 2>&1
    warn_line "PWA tailnet" "tailscale not installed"
    return 1
  end
  set status (tailscale serve status 2>/dev/null)
  if test (count $status) -eq 0
    warn_line "PWA tailnet" "no tailscale serve status"
    return 1
  end
  set ts_url (string join '\n' $status | awk '
    /^https:\/\// {current=$1; if (first=="") first=$1; next}
    /^\|--/ {
      if (current != "" && $0 ~ /\/pwa[[:space:]]+proxy[[:space:]]+http:\/\/127\.0\.0\.1:8780\/pwa/) {
        print current; found=1; exit
      }
    }
    END { if (!found && first != "") print first }
  ')
  if test -z "$ts_url"
    warn_line "PWA tailnet" "no tailscale serve URL"
    return 1
  end
  set url "$ts_url/pwa/fire/"
  set code (http_status "$url")
  if string match -rq '^(2|3)' -- "$code"
    ok_line "PWA tailnet" "$code $url"
    return 0
  end
  warn_line "PWA tailnet" "$code $url"
  return 1
end

section "Fire Dashboard"
echo "Now: "(date "+%Y-%m-%d %H:%M:%S %Z")
divider

if test -x "$firectl"
  $firectl status
else
  set_color bryellow
  echo "firectl not found: $firectl"
  set_color normal
end

divider
section "PWA Reachability"
pwa_local_health
pwa_tailnet_health

divider
section "Weekly Telegram Timer"
if command -v systemctl >/dev/null 2>&1
  set line ""
  if command -v rg >/dev/null 2>&1
    set line (systemctl --user list-timers --all --no-pager | rg "$weekly_timer" || true)
  else
    set line (systemctl --user list-timers --all --no-pager | grep -F "$weekly_timer" || true)
  end

  if test -n "$line"
    echo $line
  else
    set_color bryellow
    echo "not found: $weekly_timer"
    set_color normal
  end
else
  set_color bryellow
  echo "systemctl not available"
  set_color normal
end

divider
section "Recent Logs (Daily)"
if command -v journalctl >/dev/null 2>&1
  journalctl --user -u "$daily_service" -n 20 --no-pager 2>/dev/null || true
else
  set_color bryellow
  echo "journalctl not available"
  set_color normal
end
