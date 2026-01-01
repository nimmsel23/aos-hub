# Repository Guidelines

## Project Structure & Module Organization
- `server.js` runs the local router API and serves static files from `public/`.
- `menu.yaml` is the single source of truth for routes shown on the index UI.
- `data/` holds JSON payloads (e.g., `data/fruits_questions.json`).
- `public/` holds all frontend assets:
  - `public/index.html` is the menu-only root UI.
  - `public/game/` is the local Game Centre (`/game`).
  - `public/game/tent.html` is General’s Tent (`/game/tent`).
  - `public/door/` is the local Door Centre (`/door`).
  - `public/facts.html` is the local Fruits UI (`/facts`).
  - `public/voice/` contains Voice Centre pages.
  - `public/core4.html` is the Core4 TTY bridge page.
- Local data is read from the vault at `~/AlphaOS-Vault` (Door chapters, map entries).
- Door exports write markdown to `~/AlphaOS-Vault/Door` with subfolders `1-Potential`, `2-Plan`, `3-Production`, `4-Profit`, `War-Stacks`.

## Build, Test, and Development Commands
- `npm install` installs server and frontend dependencies.
- `npm start` (or `node server.js`) starts the local router at `http://127.0.0.1:8799`.
- `npm run core4` launches the Core4 TTY in the terminal.

## Coding Style & Naming Conventions
- JavaScript files use 2-space indentation and double quotes (match `server.js`).
- Keep file names lowercase with hyphens for pages (e.g., `public/game/tent.html`).
- Avoid non-ASCII characters in new files unless already used.
- Frontend pages are plain HTML + embedded CSS/JS (no build step).

## Testing Guidelines
- No automated test suite is configured.
- Manual checks: run `node server.js`, open `/`, `/game`, `/game/tent`, and `/door`.

## Quick Smoke Checks
- Click every card in `/game` to confirm routes open.
- In `/door`, generate Hot List, Door War, War Stack, Hit List, Profit, then export each to `/Door/` and confirm the files are written under `~/AlphaOS-Vault/Door`.
- Verify chapters load in `/door` (they should come from `/api/door/chapters`).

## Commit & Pull Request Guidelines
- Commit messages are short, imperative, and scoped to the change (e.g., “Load door chapters from vault”).
- PRs should include a brief summary, affected routes, and screenshots for UI changes.

## Security & Configuration Tips
- Local-only terminal is served via `/ws/terminal` and blocked for non-local IPs unless `TERMINAL_ALLOW_REMOTE=1`.
- Routes rely on `menu.yaml`; treat it as read-only input for UI consumers.
- Bridge handoff uses `AOS_BRIDGE_URL` (or `BRIDGE_URL`) when set.
- Vault content is read from `~/AlphaOS-Vault`; keep file paths stable.

## Documentation Locations
- Node centre docs belong in `DOCS/node/`.
