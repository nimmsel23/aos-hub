# Core4 Guidelines

## Scope
- `core4/` owns Core4 domain logic, data flow, and tooling behavior.
- Keep Core4-specific implementation in this pillar.
- `scripts/` may orchestrate Core4 actions but must not host Core4 business logic.

## Entrypoints
- Primary CLI: `core4/python-core4/core4ctl`
- Frontdoors:
  - Production overview via `aosctl core4 ...`
  - Dev/operator usage via `hubctl core4 ...`
- API probe helper (Bridge/Index smoke):
  - `core4ctl probe today`
  - `core4ctl probe week 2026-W07`
  - `core4ctl probe all`

## Coding Rules
- Reuse shared ctl helpers where applicable (`scripts/ctl-lib.sh`, `scripts/lib/aos-env.sh`, `scripts/lib/codex-subcmd.sh`).
- Avoid duplicate wrappers for Core4 commands; keep one canonical command path.
- Keep paths and env names explicit (`AOS_*`) and documented near usage.

## Blueprint-First Rule
- Core4 development should start from local blueprint/chapter artifacts placed in this pillar.
- Use these artifacts as intent; implement behavior in canonical Core4 code paths.
- If a file is not literally named `blueprint`, still treat chapter/spec files in `core4/` as source intent.
- If chapter symlinks are added in `core4/`, treat them as primary references (same policy as other pillars, pointing to `AlphaOS-blueprints/`).
- Keep blueprint-to-code mapping explicit in commit/PR notes for behavioral changes.

## Lint In Plain Language
- `scripts/scripts-lint.sh` checks ctl wiring conventions across the repo.
- `ERROR` means broken integration and must be fixed.
- `WARN` usually means legacy compatibility debt, not always a hard blocker.

## Validation
- Run `bash -n` on changed shell scripts.
- Run `scripts/scripts-lint.sh` when touching any `*ctl` integration.
