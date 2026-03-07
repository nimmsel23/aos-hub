#!/usr/bin/env bash
set -euo pipefail

# Show available calendars without ANSI color noise (easier to copy names from).
exec gcalcli --nocolor list "$@"
