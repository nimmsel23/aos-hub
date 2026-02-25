# shellcheck shell=bash

if [[ "${__AOS_CTL_UI_LOADED:-0}" == "1" ]]; then
  return 0 2>/dev/null || true
fi
__AOS_CTL_UI_LOADED=1

CTL_UI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck disable=SC1091
source "$CTL_UI_DIR/ui-base.sh"
# shellcheck disable=SC1091
source "$CTL_UI_DIR/ui-menu-gum.sh"
# shellcheck disable=SC1091
source "$CTL_UI_DIR/ui-menu-fzf.sh"
# shellcheck disable=SC1091
source "$CTL_UI_DIR/ui-choose.sh"
