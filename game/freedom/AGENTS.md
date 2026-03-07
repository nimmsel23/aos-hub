# Freedom Map Guidelines

Das zugehörige `freedomctl`-Skript wird aktiv von Codex bzw. Claude-Code verwendet.

## Scope
- `game/freedom/` owns Freedom/IPW map domain logic and tooling for the Game cascade.
- Freedom sits between Frame (facts/now) and Focus (monthly mission) and should preserve stable cascade keys.

## Stack
- `freedom.py` — Python engine (legacy/interactive flow)
- `freedomctl` — Bash dispatcher (ctl pattern)
- `game/lib/game_proto.sh` — local terminal prototype scaffolder (quarterly YAML)

## Prototype Scaffold (Codex Session)
- `freedomctl scaffold [DOMAIN|all] [YYYY-QN]`
- Writes `game/freedom/prototypes/<DOMAIN>/<YYYY-QN>/quarterly.yaml`
- Includes `source_refs.frame` pointing to `game/frame/prototypes/.../annual.yaml`
- Keep YAML keys stable: `type`, `domain`, `period`, `source_refs`, `horizon`, `vision`

## Commands
```bash
freedomctl new [DOMAIN] [--year YYYY]
freedomctl show [DOMAIN]
freedomctl list
freedomctl edit [DOMAIN]
freedomctl scaffold [DOMAIN|all] [YYYY-QN]
```
