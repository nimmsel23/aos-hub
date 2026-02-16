# scripts/ Operating Model

This directory has three explicit tiers. The goal is to make ownership and behavior predictable.

## 1) Tiers

### `strict ctl` (policy-enforced)
- Location: `scripts/*ctl` (selected set)
- Must use shared helpers:
  - `scripts/lib/codex-subcmd.sh`
  - `scripts/lib/aos-env.sh`
  - `scripts/ctl-lib.sh`
- Must not redefine common helper functions locally.

Current strict set:
- `backupctl`
- `firectl`
- `gamectl`
- `gasctl`
- `hubctl`
- `indexctl`
- `mountctl`
- `nodectl`
- `rclonectl`
- `syncctl`
- `telectl`

### `legacy ctl` (migration backlog)
- Still in active use, but not yet fully aligned to strict contract.
- Migration target: strict ctl.

Current legacy set:
- `aos-aliasctl`
- `aos-syncctl`
- `blueprintctl`
- `gitctl`
- `hookctl`
- `systemstatusctl`

### `wrapper ctl` (compatibility passthrough)
- Thin wrappers that forward to the real implementation via `exec`.

Current wrappers:
- `doorctl` -> `door/cli/doorctl`
- `voicectl` -> `voice/cli/voicectl`
- `syncvaultctl` -> `syncctl` (deprecated forwarder)

## 2) Directory Map

- `lib/`: shared shell libraries (`aos-env.sh`, `codex-subcmd.sh`)
- `ctl-lib.sh`: shared UI/system helpers for strict ctls
- `sync-utils/`: canonical sync helper scripts
- `utils/`: legacy duplicates/fallbacks (migration target: consolidate into `sync-utils/`)
- `taskwarrior/`: hooks and export helpers
- `automation/`, `hot-list/`, `war-stack/`: domain-specific/legacy tooling

## 3) Fixed Rules

1. New operational frontdoors go into `scripts/*ctl`.
2. New `*ctl` scripts start in strict mode (shared libs mandatory).
3. No local redefinition of common helpers (`msg/warn/die/has_cmd/ui_*`).
4. Wrapper scripts stay minimal and only delegate.
5. Duplicate helper implementations are migration debt and should be moved to `ctl-lib.sh` or `lib/`.

## 4) Validation

Run:

```bash
scripts/scripts-lint.sh
```

What it checks:
- strict ctl contract compliance
- legacy ctl migration warnings
- wrapper delegation sanity
- duplicate helper scripts in `sync-utils/` vs `utils/`

## 5) Contribution Workflow

1. Implement/change script.
2. Run `bash -n <changed scripts>`.
3. Run `scripts/scripts-lint.sh`.
4. If introducing a new `*ctl`, either:
   - make it strict-compliant, or
   - explicitly classify it as legacy/wrapper in `scripts/scripts-lint.sh` with a reason in commit message.
