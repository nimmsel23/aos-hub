# GAME

## Changelog

### 2026-03-07

- Restored navigation split to match runtime intent:
  - desktop/menu entries stay on classic `/game*` routes
  - mobile install entry stays on dedicated `/pwa/*` links
- Clarified chapter chain in desktop Game Centre copy:
  - `Frame -> Freedom -> Focus -> Fire -> Tent`

## Chapter Soll-Zustand

Game follows one stable cascade:

1. `Frame` (current reality, facts)
2. `Freedom` (vision / horizon)
3. `Focus` (monthly mission)
4. `Fire` (weekly execution map)
5. `Tent` (weekly synthesis, corrections, recommitment)

Invariant:
- Every lower layer must serve the layer above it.
- Cascade direction is always `Frame -> Freedom -> Focus -> Fire -> Tent`.

## Canonical Frontdoors

- Desktop/frontdoor routes:
  - `Game`: `/game`
  - `Frame`: `/game/frame`
  - `Freedom`: `/game/freedom`
  - `Focus`: `/game/focus`
  - `Fire`: `/game/fire`
  - `Tent`: `/game/tent`
- Mobile/install routes:
  - `Game`: `/pwa/game/`
  - `Frame`: `/pwa/frame/`
  - `Freedom`: `/pwa/freedom/`
  - `Focus`: `/pwa/focus/`
  - `Fire`: `/pwa/fire/`

Navigation rule:
- Normal menu buttons stay on desktop `/game*` routes.
- `mobile_links` are the explicit PWA entry layer for phone install/use.

## Backend Expectations

- Menu SSOT remains `index-node/menu.yaml`.
- APIs stay mounted in `index-node/server.js` / route modules.
- Cross-centre intelligence and cascade checks remain active in `server.js` (Tent synthesis, temporal cascade alignment).

## Parallel Development Split (4 Codex Workers)

Use disjoint ownership to avoid merge conflicts:

1. `Frame/Freedom` surface + route consistency
   - files: `public/game/frame.html`, `public/game/freedom.html`, related route entries/docs
2. `Focus/Fire` surface + cascade handoff consistency
   - files: `public/game/focus.html`, `public/game/fire.html`, related export/cascade docs
3. `Tent` synthesis UI + telemetry alignment
   - files: `public/game/tent.html`, tent route/service docs
4. `Game Hub + docs + menu consistency`
   - files: `public/game/index.html`, `public/pwa/game/*`, `menu.yaml`, `DOCS/node/*game*`, this `GAME.md`

Rule:
- Nobody rewrites another worker's owned files in the same wave without explicit handoff.

## Known Gaps

- `Tent` does not yet have its own standalone `/pwa/tent/` scope; it still lives under `/game/tent`.
- Legacy standalone HTML centre pages still exist (`/game/*.html`) and remain valid desktop surfaces.
