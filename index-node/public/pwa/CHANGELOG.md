# PWA — Changelog

All three PWAs live under `index-node/public/pwa/` and are served at `/pwa/{name}/`.

---

## 2026-02-19

### Structure
- Migrated `public/core4/`, `public/fire/`, `public/focus/` → `public/pwa/core4/`, `public/pwa/fire/`, `public/pwa/focus/`
- Renamed `fire.html` and `focus.html` → `index.html` (consistent with core4; enables express.static auto-serve)
- Legacy routes `/core4`, `/fire`, `/focus` now 301-redirect to canonical `/pwa/{name}/`
- Updated `~/aos-hub/core4/web` symlink to new path

### core4
- Added per-habit weekly mini SVG rings (completions/7 this week) — data from `week-summary.totals.by_habit`
- Replaced duplicate top tabs with clean `appbar` header (title + date)
- Hero: added WEEK identifier block, TODAY sub-label on ring
- Fixed ERR_TOO_MANY_REDIRECTS: Express non-strict routing caused `/core4` redirect to match `/core4/` too; fixed by using `index.html` so `express.static` serves directly
- Committed: `a5de9d7`, `3125cfb`

### fire
- Nav links updated to `/pwa/core4/`, `/pwa/focus/`

### focus
- Nav links updated to `/pwa/core4/`, `/pwa/fire/`

---

## Format
Each entry: date → what changed → why (if non-obvious) → commit ref if known.
