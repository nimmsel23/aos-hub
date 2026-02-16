# Game Guidelines

## Scope
- `game/` owns Game pillar domain logic and center-specific behavior (Frame/Freedom/Focus/Fire/Tent).
- Keep Game-specific implementation in this pillar.
- `scripts/` is orchestration/frontdoor only and should not contain Game business logic.

## Entrypoints
- Primary Game tooling stays in `game/` subfolders.
- Frontdoors:
  - Production/system view via `aosctl game ...`
  - Dev/user workflows via `hubctl game ...`

## Coding Rules
- Preserve center boundaries and cascade expectations across Game sub-centres.
- Prefer canonical paths in this pillar over wrapper indirections in `scripts/`.
- Reuse shared helper libs for ctl-style scripts (`scripts/ctl-lib.sh`, `scripts/lib/aos-env.sh`, `scripts/lib/codex-subcmd.sh`).

## Blueprint-First Rule
- Game development should start from local chapter/blueprint files inside this pillar.
- Use those files as behavior intent, then implement in canonical Game paths (`game/fire`, `game/focus`, `game/gas-*`, etc.).
- Keep chapter-to-implementation mapping explicit in commit/PR notes for non-trivial changes.
- Primary chapter references are local symlinks in `game/` (e.g. `32 - Frame.md` ... `42 - The Alpha Odyssey.md`) pointing to `AlphaOS-blueprints/`.
- Additional chapter sources:
  - `game/gas-game-dev/Game_Freedom_Chapter33.html`
  - `game/gas-game-dev/Game_Focus_Chapter34.html`
- If more blueprint files are added, keep them in `game/` and extend this section.

## Lint In Plain Language
- `scripts/scripts-lint.sh` validates ctl structure and integration consistency.
- `ERROR` blocks merge/use; fix immediately.
- `WARN` is a migration hint or legacy reminder; reduce over time.

## Validation
- Run `bash -n` for changed shell scripts.
- Run `scripts/scripts-lint.sh` when ctl wiring changes.
