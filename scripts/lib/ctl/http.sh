# shellcheck shell=bash

format_json() {
  if has_jq; then
    jq -C . 2>/dev/null || cat
  elif has_cmd python3; then
    python3 -m json.tool
  elif has_cmd python; then
    python -m json.tool
  else
    cat
  fi
}

curl_json() {
  local url="$1"
  local connect_timeout="${CTL_CURL_CONNECT_TIMEOUT:-5}"
  local max_time="${CTL_CURL_MAX_TIME:-30}"
  need_cmd curl
  curl -fsS --connect-timeout "$connect_timeout" --max-time "$max_time" "$url" 2>&1 || return 1
}

curl_json_post() {
  local url="$1"
  local connect_timeout="${CTL_CURL_CONNECT_TIMEOUT:-5}"
  local max_time="${CTL_CURL_MAX_TIME:-30}"
  need_cmd curl
  curl -fsS --connect-timeout "$connect_timeout" --max-time "$max_time" -X POST "$url" 2>&1 || return 1
}

curl_json_post_data() {
  local url="$1"
  local data="$2"
  local connect_timeout="${CTL_CURL_CONNECT_TIMEOUT:-5}"
  local max_time="${CTL_CURL_MAX_TIME:-30}"
  need_cmd curl
  curl -fsS --connect-timeout "$connect_timeout" --max-time "$max_time" -X POST -H "Content-Type: application/json" -d "$data" "$url" 2>&1 || return 1
}
