# Repository Guidelines

Das zugehörige `indexctl`-Skript wird aktiv von Codex bzw. Claude-Code verwendet und bei Bedarf weiterentwickelt.

## Project Structure & Module Organization
- `server.js` runs the local router API and serves static files from `public/`.
- `menu.yaml` is the single source of truth for routes shown on the index UI.
- `menu.yaml` is also the source for `mobile_links` (MOBILE hover launcher) and `pwa_ctx` metadata.
- `data/` holds JSON payloads (e.g., `data/fruits_questions.json`).
- `public/` holds all frontend assets:
  - `public/index.html` is the menu-only root UI.
  - `public/game/` is the local Game Centre (`/game`).
  - `public/game/tent.html` is General’s Tent (`/game/tent`).
  - `public/door/` is the local Door Centre (`/door`).
  - `public/facts.html` is the local Fruits UI (`/facts`).
  - `public/voice/` contains Voice Centre pages.
- `public/core4.html` is the Core4 TTY bridge page (legacy terminal view).
- `public/pwa/core4/` is the **mobile-first Core4 PWA** — served at `/pwa/core4/`.
- `/core4` is legacy and redirects to `/pwa/core4/`.
- The mobile hover launcher button ("MOBILE") lives in `public/index.html` under `.pwa-launcher`, but links are loaded dynamically from `/menu` (`mobile_links`), not hardcoded in HTML.
- Local data is read from the vault at `~/AlphaOS-Vault` (Door chapters, map entries).
- Door exports write markdown to `~/AlphaOS-Vault/Door` with subfolders `1-Potential`, `2-Plan`, `3-Production`, `4-Profit`, `War-Stacks`.

## Build, Test, and Development Commands
- `npm install` installs server and frontend dependencies.
- `npm run dev` is the default local runtime (`nodemon`, port `8799`).
- `npm start` (or `node server.js`) runs the plain production-style node process.
- `npm run core4` launches the Core4 TTY in the terminal.

## Coding Style & Naming Conventions
- JavaScript files use 2-space indentation and double quotes (match `server.js`).
- Keep file names lowercase with hyphens for pages (e.g., `public/game/tent.html`).
- Avoid non-ASCII characters in new files unless already used.
- Frontend pages are plain HTML + embedded CSS/JS (no build step).

## Testing Guidelines
- No automated test suite is configured.
- Manual checks: run `npm run dev`, open `/`, `/game`, `/game/tent`, and `/door`.

## Quick Smoke Checks
- Click every card in `/game` to confirm routes open.
- In `/door`, generate Hot List, Door War, War Stack, Hit List, Profit, then export each to `/Door/` and confirm the files are written under `~/AlphaOS-Vault/Door`.
- Verify chapters load in `/door` (they should come from `/api/door/chapters`).
- Open `/pwa/core4/` (or `/core4` legacy redirect) — mobile PWA, 4 domain cards, `.5/.5` toggles.
  - Uses canonical: `GET /api/core4/day-state`, `GET /api/core4/week-summary`, `POST /api/core4/log`
  - Do **not** use legacy `POST /api/core4` or `GET /api/core4/today` in new UI code.

## Core4 API Summary
See `api-map.md` for full reference. Short version:
- **Canonical:** `/api/core4/log` (POST) · `/api/core4/day-state` (GET) · `/api/core4/week-summary` (GET)
- **Legacy (compat-only):** `POST /api/core4` · `GET /api/core4/today`
- Storage: `~/.local/share/alphaos/core4/.core4/events/` (event ledger, append-only, no undo)

## Core4 PWA Expansion Note
- For `pwa/core4`, treat Journal and Timeline as planned first-class modules.
- Journal exists in tracker/backend and should be surfaced in the mobile PWA UX.
- Timeline/history data already exists via day/week APIs and should be made visible in `pwa/core4`.
- Preferred API set for this expansion:
- `GET /api/core4/day-state`
- `GET /api/core4/week-summary`
- `GET /api/core4/journal`
- `POST /api/core4/journal`

## Commit & Pull Request Guidelines
- Commit messages are short, imperative, and scoped to the change (e.g., “Load door chapters from vault”).
- PRs should include a brief summary, affected routes, and screenshots for UI changes.

## Security & Configuration Tips
- Local-only terminal is served via `/ws/terminal` and blocked for non-local IPs unless `TERMINAL_ALLOW_REMOTE=1`.
- Routes rely on `menu.yaml`; treat it as read-only input for UI consumers.
- Bridge handoff uses `AOS_BRIDGE_URL` (or `BRIDGE_URL`) when set.
- PWA ctx control endpoints are local-only by default:
  - `GET /api/pwa/ctx` (status for all dedicated ctx runtimes)
  - `POST /api/pwa/ctx/:app` with `{"action":"status|start|stop|restart|enable|disable"}`
  - Remote access requires `AOS_PWA_CTX_ALLOW_REMOTE=1`.
- Vault content is read from `~/AlphaOS-Vault`; keep file paths stable.
- API PIN barrier can block Core4 PWA API calls (`/api/core4/*`) on write methods and may surface as frontend parse/auth errors.
- Use `index-node/nodectl` for PIN operations:
  - `nodectl pin status`
  - `nodectl pin off` (writes `~/.aos/pin.disabled`)
  - `nodectl pin on`
  - `nodectl pin clear-sessions`
- `nodectl`/`indexctl` service control is **user-service only** (`aos-index-dev.service` via `systemctl --user`).
- After changing PIN flag/config, restart index-node (`nodectl restart` / service restart) before retesting PWA.
- If restart crashes, collect logs first:
  - `journalctl --user -u aos-index-dev.service -n 120 --no-pager`

## Documentation Locations
- Node centre docs belong in `DOCS/node/`.

## Routing Matrix (PWA vs Desktop)
This repo intentionally exposes PWAs through two equivalent path shapes, plus legacy/desktop centre routes.

PWA Runtime B (Standalone, port 8780, `pwa-server.js`):
- Direct PWA aliases (no `/pwa` prefix): `/core4`, `/fire`, `/focus`, `/frame`, `/freedom`, `/door`, `/game`, `/memoirs`, `/fitness`
- Canonical PWA paths: `/pwa/core4/`, `/pwa/fire/`, `/pwa/focus/`, `/pwa/frame/`, `/pwa/freedom/`, `/pwa/door/`, `/pwa/game/`, `/pwa/memoirs/`, `/pwa/fitness/`
- Both resolve to the same app-shell assets under `public/pwa/*`. The alias paths exist to survive Tailnet/Funnel setups that strip the `/pwa` prefix.

PWA Runtime A (Main index-node, port 8799, `server.js`):
- Serves PWAs under `/pwa/*` from `public/pwa/*` (same files as standalone).
- Redirects `/pwa/<app>` → `/pwa/<app>/` for canonical trailing slash.

PWA Runtime C (Dedicated ctx per app, independent services):
- Backed by `index-node/pwa-app-server.js` and `~/.dotfiles/bin/pwactx`.
- One app per process/port/service (systemd user, `Restart=always`):
  - `core4:8781` (`aos-pwa-core4-ctx.service`)
  - `fire:8782` (`aos-pwa-fire-ctx.service`)
  - `focus:8783` (`aos-pwa-focus-ctx.service`)
  - `frame:8784` (`aos-pwa-frame-ctx.service`)
  - `freedom:8785` (`aos-pwa-freedom-ctx.service`)
  - `door:8786` (`aos-pwa-door-ctx.service`)
  - `game:8787` (`aos-pwa-game-ctx.service`)
  - `memoirs:8790` (`aos-pwa-memoirs-ctx.service`)
- Purpose: each key PWA remains reachable even if shared runtime (`:8780`) is broken.

Desktop / Legacy Centres (Main index-node, port 8799):
- Old centre UIs remain under routes like `/game/tent`, `/game/fire`, `/game/focus`, `/game/frame`, `/game/freedom`, `/door`, etc.
- These are exposed via `menu.yaml` + `server.js` and are distinct from the mobile-first PWAs.

Tailnet/Funnel note:
- In tailnet, the PWA base might be exposed at `https://<host>.ts.net/pwa` → `http://127.0.0.1:8780/pwa`.
- Because some proxies strip the `/pwa` prefix, the direct alias routes above are required and are treated as first-class.

Menu/API note:
- `/menu` now returns both:
  - `links` (classic index/router link source)
  - `mobile_links` (MOBILE hover launcher source)
- `GET /api/pwa/mobile-links` exposes only the mobile launcher subset for lightweight consumers.
