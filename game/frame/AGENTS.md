# Frame Map Guidelines

Das zugehörige `framectl`-Skript wird aktiv von Codex bzw. Claude-Code verwendet.

## Scope
- `game/frame/` owns Frame Map domain logic and tooling.
- Vault writes go to `~/AlphaOS-Vault/Game/Frame/DOMAIN_frame.md`.
- Node reads same path — filename convention must stay stable.

## Stack
- `frame.py` — Python engine (read/write vault)
- `framectl` — Bash dispatcher (ctl pattern)
- `frame.fish` — Fish dashboard (gum UI wrapper)

## Filename Convention
`{DOMAIN}_frame.md` — e.g. `BODY_frame.md`, `BUSINESS_frame.md`
Node expects exactly this format via `scanForMap()`.

## Commands
```bash
framectl new [DOMAIN]    # create/update frame
framectl show [DOMAIN]   # display
framectl list            # all frames
framectl edit [DOMAIN]   # open in $EDITOR
```
