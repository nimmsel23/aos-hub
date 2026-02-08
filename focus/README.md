# Focus (Monthly Mission → Fire Execution)

This folder is the documentation home for everything Focus-related in `aos-hub`.

## Mental Model

- **Focus Map**: monthly (or quarterly) mission that shrinks the journey (Freedom horizon → next doable waves).
- **Output**: 4 pillars per domain: Habits, Routines, Additions, Eliminations.
- **Cascade**: Freedom → Focus → Fire (Fire Maps reference Focus Maps via YAML `focus_maps:`).

## Blueprint Reference

- Source text: `~/AlphaOS-Vault/AlphaOS-blueprints/34 - Focus.md` (Elliott Hulse, Chapter 34)

## Where The Code Lives

- Index Node Focus Centre UI: `index-node/public/game/focus.html`
- Index Node endpoints + vault write: `index-node/server.js`
  - `/game/focus`
  - `GET /api/game/focus/state` / `POST /api/game/focus/state`
  - `GET /api/game/focus/list`
  - `GET /api/game/focus/load`
  - `POST /api/game/export` (map=`focus`)
- GAS fallback implementation: `gas/game_focus.gs`

## Storage

- Focus Maps (markdown): `~/AlphaOS-Vault/Game/Focus/*.md`
- Draft autosave state: `~/AlphaOS-Vault/Game/Focus/.focus-state.json`

## File Format

Focus Maps are markdown with YAML front matter (Obsidian/Dataview friendly):

- `domain`: BODY|BEING|BALANCE|BUSINESS
- `month`: human label (e.g. "January 2026")
- `phase`: `current|q1|q2|q3|q4`
- `type`: `focus-map`
- `status`: `locked`
- `tags`: includes `focus`, domain, and phase

## Naming Convention (Important)

Locked Focus Map filename base:

`{DOMAIN}_focus_{Month}_{Year}`

Example: `BODY_focus_January_2026.md`

Fire Maps use these bases in their YAML `focus_maps:` object to connect execution → mission.

## Troubleshooting

- If saved maps do not show up in the UI, verify the vault exists at `~/AlphaOS-Vault/Game/Focus/`.
- If Fire Map cascade queries break, check Focus filenames stayed stable (no renames without updating Fire YAML).
