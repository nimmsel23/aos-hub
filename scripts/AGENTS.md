# Scripts Guidelines

Das zugehörige `hubctl`-Skript wird aktiv von Codex bzw. Claude-Code verwendet und bei Bedarf weiterentwickelt.

Die `syncctl`- / `vaultctl`-Scripts sind unsere aktive Codex-Frontdoor für Rclone- und Vault-Syncs; Änderungen sollten dort koordiniert werden.

## Purpose
- `scripts/` is the operational control layer for `aos-hub`.
- Keep command behavior predictable and discoverable.
- Prefer one clear frontdoor per workflow (`aosctl`, `hubctl`, `syncctl`, etc.).

## Hard Rules
- Do not add standalone wrapper scripts that only forward to another script.
- Integrate behavior into existing commands instead of creating alias chains.
- Keep runtime wiring explicit and maintainable (no hidden fallback mazes).
- Every user-facing command change must update `../registry.tsv` in the same change.
- Pillar-specific logic must not live in `scripts/`:
  - Door domain logic (`hot`, `warstack`, `profit`, `doorwar`, etc.) belongs under `../door/`.
  - Game domain logic belongs under `../game/`.
  - Voice domain logic belongs under `../voice/`.
  - Core4 domain logic belongs under `../core4/`.
- `scripts/` is orchestration/frontdoor only; if a legacy script remains here, keep it as a thin wrapper and migrate logic into the pillar folder.

## Registry Discipline
- `../registry.tsv` is SSOT for command inventory and naming.
- When adding/moving/renaming commands:
  - update registry entry,
  - update caller wiring (`aosctl`/`hubctl`/service files),
  - update docs that describe how to invoke it.

## Sync Stack Policy
- Canonical sync frontdoor: `syncctl`.
- Avoid reintroducing legacy split control paths (`syncvaultctl` style indirections).
- Prefer direct calls to canonical scripts under `scripts/sync-utils/` when needed.
- Default vault path policy: prefer `~/vault` (via env defaults), keep legacy paths only as compatibility inputs.

## Change Workflow
- Before editing: map who calls the script (CLI, systemd, other scripts).
- After editing:
  - run `bash -n` on changed shell scripts,
  - run `./scripts/scripts-lint.sh` when `*ctl` scripts are touched,
  - verify at least one real invocation path end-to-end.

## Documentation Quality
- If docs conflict with runtime behavior, fix docs in the same change.
- Keep docs short and operational: entrypoint, required env, main commands, failure modes.
