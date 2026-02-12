# GAS Docs Index

Role:
- Cloud runtime and active fallback for selected functions.

Main runtime repo path:
- `gas/`

## When to Use GAS

- Cloud-first access is required.
- Local `index-node` runtime is unavailable for a covered function.
- A function is intentionally offloaded to GAS as operational primary.

## Start Here

1. Runtime and architecture: `gas/README.md`
2. GAS HQ details: `hq.md`
3. Alignment and fallback model: `../ALIGNMENT_INDEXNODE_GAS.md`

## Centre Docs (GAS)

- `door.md`
- `door-hotlist.md`
- `door-war.md`
- `door-warstack.md`
- `door-profit.md`
- `game.md`
- `core4.md`
- `fruits.md`
- `voice.md`
- `functions-in-use.md`
- `script-properties.md`

## Active Fallback Checklist

1. Confirm function is listed in `../ALIGNMENT_INDEXNODE_GAS.md`.
2. Validate function behavior in GAS under fallback conditions.
3. Verify required integrations (Bridge, Taskwarrior, TickTick, Drive/Vault).
4. Update function status label (`green/yellow/red`) in alignment registry.
