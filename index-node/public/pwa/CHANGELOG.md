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

---

## 2026-02-24

### Structure (all 5 PWAs live)
- Added **FREEDOM** PWA at `/pwa/freedom/` — Annual IPW Vision (Ideal Parallel World)
  - Year selector (← 2025 · **2026** · 2027 →), 4 domain cards per year
  - Storage: `~/.aos/freedom/YYYY/{domain}.md`
  - Gold/amber accent (#e8a838), horizon+sun icon
  - API: GET /year, GET /domain, POST /domain/save
- Added **FRAME** PWA at `/pwa/frame/` — Current Reality Snapshot ("Where am I now?")
  - 4 domain cards with staleness indicators (fresh <30d / aging 30-90d / stale >90d)
  - Storage: `~/.aos/frame/{domain}.md`
  - Green accent (#7ec8a0), four-corners frame icon
  - API: GET /domains (with preview+timestamp), GET /domain, POST /domain/save
  - Auto-updates `updated:` frontmatter field on save
- Both PWAs: DayOne-inspired design, mobile fullscreen switching, installable (manifest+sw)
- MOBILE launcher updated: now shows all 5 (FRAME/FREE/FOCUS/FIRE/CORE4)
- Committed: `3815d05`

### focus
- No changes (already DayOne-style from fd768d5)

---

## 2026-02-25

### core4
- **Design overhaul**: Replaced emoji icons with custom SVG piktograms (consistent with awesome habits)
- **Domain color system**: Each domain now has its own color (Body: green, Being: blue, Balance: purple, Business: orange)
  - Applied to: card icons, mini rings, progress bars, score numbers
- **Mini rings**: Increased size (34px → 40px) for better visibility
- **Date format**: Improved from "2026-02-25" → "25. Feb 2026"
- **Bottom nav**: Updated to show all 5 PWAs (FRAME/FREE/FOCUS/FIRE/CORE) instead of outdated SCORE button
- **Card icons**: Reduced size (40px → 32px) for cleaner look
- Result: Unified design language across all PWAs, better visual hierarchy, domain-specific color coding

---

## 2026-02-27

### frame
- Storage switched from markdown docs to YAML state files: `~/.aos/frame/{domain}.yaml` (no `.md` writes for new saves).
- `/api/frame/*` now reads/writes YAML state objects with stable `questions.*` keys.
- Legacy fallback: existing `~/.aos/frame/{domain}.md` is read and migrated to `.yaml` on first domain load.
- `/api/game/frame/*` compatibility endpoints now also persist YAML state (same backend shape).
- `pwa/frame` remains markdown-first in the editor; YAML stays backend-only state.
- codex-mapguard -> codex-neighbor: FRAME SSOT is YAML state in `routes/frame.js`; keep editor UX markdown-only.

### freedom + focus editor flow
- `pwa/freedom` edits body markdown only; route composes YAML frontmatter on save (`index-node/routes/freedom.js`).
- `pwa/focus` mission/entries now load as editor-body markdown (no frontmatter/cascade blocks in textarea).
- `routes/focus.js` preserves frontmatter + managed cascade bundles server-side on save.

### cascade headers
- Focus map generation now uses managed cascade blocks:
  - **FREEDOM HEADER** (quarterly direction)
  - **FRAME FOOTER** (annual YAML truth)
- Weekly Fire cascade now injects a dedicated **FOCUS HEADER** (monthly mission context).
- Applies in both route stacks for focus: `/api/focus/*` and `/api/game/focus/*`.

---

## Format
Each entry: date → what changed → why (if non-obvious) → commit ref if known.
