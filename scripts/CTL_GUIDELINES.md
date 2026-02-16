# CTL Guidelines (Canonical)

This file defines the contract for `aos-hub/scripts/*ctl`.

## Required Shared Blocks

Every strict `*ctl` script must source:

```bash
source "$ROOT_DIR/scripts/lib/codex-subcmd.sh"
codex_subcmd_maybe "<centre>" "<tool>" "$@" && exit 0

source "$SCRIPT_DIR/lib/aos-env.sh"
aos_env_load "" "$ROOT_DIR" || true

source "$SCRIPT_DIR/ctl-lib.sh"
```

Notes:
- `ROOT_DIR` and `SCRIPT_DIR` may vary by script; path resolution must stay correct.
- `aos_env_load` can be strict or soft fail, depending on tool requirements.

## Helper Policy

Common helpers are centralized in `scripts/ctl-lib.sh`.

Do not redefine locally:
- `msg`, `warn`, `die`
- `has_cmd`, `has_gum`, `has_fzf`
- `ui_title`, `ui_info`, `ui_ok`, `ui_err`, `ui_warn`
- `choose` (unless explicitly documented as compatibility bridge)

Per-tool UI tuning must use `CTL_*` vars, for example:
- `CTL_APP_PREFIX`
- `CTL_UI_OK_PREFIX`, `CTL_UI_ERR_PREFIX`, `CTL_UI_WARN_PREFIX`
- `CTL_CHOOSE_PROMPT`, `CTL_CHOOSE_PREFER`
- `CTL_FZF_HEIGHT`, `CTL_FZF_REVERSE`, `CTL_FZF_PROMPT_SUFFIX`

## Script Classes

### strict ctl
- Full contract required
- Enforced by `scripts/scripts-lint.sh`

### legacy ctl
- Still functional, not fully migrated
- Must be migrated to strict over time

### wrapper ctl
- Pass-through only (single-responsibility delegate)
- Should use `exec` to avoid shell nesting

## Validation

Run:

```bash
scripts/scripts-lint.sh
```

The linter is the source of truth for strict/legacy/wrapper classification and contract checks.
