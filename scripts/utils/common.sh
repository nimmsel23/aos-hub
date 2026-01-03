#!/usr/bin/env bash
set -o pipefail

# Minimal common helpers for repo-local utils (ported from dotfiles).

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

script_header() {
  local script_name="$1"
  local description="${2:-}"
  if [ "${AOS_NO_CLEAR:-0}" != "1" ]; then
    clear
  fi
  echo "═══════════════════════════════════════════"
  echo "🔧 $script_name"
  echo "═══════════════════════════════════════════"
  if [ -n "$description" ]; then
    echo "$description"
    echo ""
  fi
}

