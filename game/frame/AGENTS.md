# Frame Map Guidelines

Das zugehörige `framectl`-Skript wird aktiv von Codex bzw. Claude-Code verwendet.

## Scope
- `game/frame/` owns Frame Map domain logic and tooling.
- Editor state lives at `~/.aos/frame/{domain}.yaml` (SSOT for Frame edits).
- Vault exports land at `~/vault/Game/Frame/` via `/api/game/export`.

## Stack
- `frame.py` — Python engine (read/write `.aos` frame state)
- `framectl` — Bash dispatcher (ctl pattern)
- `frame.fish` — Fish dashboard (gum UI wrapper)

## Filename Convention
`{domain}.yaml` — e.g. `body.yaml`, `business.yaml` in `~/.aos/frame/`.
Vault exports are handled by `/api/game/export` (domain-aware merge).

## Commands
```bash
framectl new [DOMAIN]    # create/update frame
framectl show [DOMAIN]   # display
framectl list            # all frames
framectl edit [DOMAIN]   # open in $EDITOR
framectl scaffold [DOMAIN|all] [YEAR]   # prototype annual.yaml in repo
```

## Prototype Scaffold (Codex Session)
- Prototype files are written to `game/frame/prototypes/<DOMAIN>/<YEAR>/annual.yaml`.
- This scaffold is for terminal-first cascade flow tests and future Node/GAS adapters.
- Keep YAML keys stable (`type`, `domain`, `period`, `source_refs`) once downstream readers depend on them.
