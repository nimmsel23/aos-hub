# shellcheck shell=bash

ui_menu_fzf() {
  local prompt="$1"
  shift || true
  local -a options=("$@")
  [[ "${#options[@]}" -gt 0 ]] || return 1
  has_fzf || return 1
  ctl_can_prompt || return 1

  local height="${CTL_FZF_HEIGHT:-~50%}"
  local reverse="${CTL_FZF_REVERSE:-0}"
  local border="${CTL_FZF_BORDER:-1}"
  local suffix="${CTL_FZF_PROMPT_SUFFIX:- > }"
  local fzf_prompt="${CTL_FZF_PROMPT:-${prompt}${suffix}}"
  local -a fzf_args=("--prompt=$fzf_prompt")

  [[ -n "$height" ]] && fzf_args+=("--height=$height")
  [[ "$border" == "1" ]] && fzf_args+=("--border")
  [[ "$reverse" == "1" ]] && fzf_args+=("--reverse")

  printf '%s\n' "${options[@]}" | fzf "${fzf_args[@]}"
}
