# Repository Guidelines

## Project Structure & Module Organization
- `index-node/` is the local HQ web UI + API server (Node.js, port `8799`).
- `router/` is the Telegram router bot (aiogram) and extensions.
- `bridge/` is the aiohttp service (Core4/Fruits/Tent/task routing, port `8080`, optional token auth).
- `gas/` is a local symlink to a private GAS HQ workspace (typically `~/.gas/HQ`) and is treated as external/private.
- Pillars live at the repo root:
  - `core4/` (Core4 pillar; CLI lives in `core4/python-core4/`)
  - `door/` (Door pillar; tools live in `door/python-hot/`, `door/python-warstack/`, standalone GAS dev in `door/gas-door-dev/`)
  - `voice/` (Voice pillar; standalone GAS Fruits dev in `voice/gas-fruits-dev/`)
  - `game/` (Game pillar container; sub-centres live in `game/fire/`, `game/focus/`, etc; bots live in `game/python-firemap/`, `game/python-tent-bot/`)
- `scripts/` and `systemd/` provide operational tooling and units (preferred entrypoint: `scripts/hubctl`).
- `DOCS/` is a portal + archive. SSOT pillar docs live in the pillar roots (see `DOCS/DOC_SYSTEM.md`).

## Build, Test, and Development Commands
- `cd index-node && npm install && npm start` starts the HQ server.
- `cd index-node && npm run dev` runs the HQ server with nodemon.
- `cd router && pip install -r requirements.txt && python router_bot.py` runs the Telegram router.
- `cd bridge && python app.py --host 0.0.0.0 --port 8080` runs the bridge.
- `./scripts/aos-doctor` or `./hubctl doctor` produces a multi-service health report.
- `./nodectl monitor` checks the Node index service (systemd + health).
- Service CLIs:
  - `./hubctl router ...` (→ `router/routerctl`)
  - `./hubctl bridge ...` (→ `bridge/bridgectl`)
  - `./hubctl heartbeat ...` (→ `scripts/heartbeat`)
  - `./hubctl tele ...` (→ `scripts/telectl`)
  - `./hubctl doctor` (multi-service)
- Bridge CLI is intentionally split for readability but kept stable:
  - `bridge/bridgectl` (dispatcher) → `bridge/bridge-servicectl`, `bridge/bridge-apictl`, `bridge/bridge-tsctl`.

## Coding Style & Naming Conventions
- Follow component-specific guides in `index-node/AGENTS.md`, `router/AGENTS.md`, `bridge/AGENTS.md`, and `gas/AGENTS.md`.
- Node.js code uses 2-space indentation and double quotes; keep pages lowercase with hyphenated names.
- Keep handlers small and stateless in router/bridge code; return JSON errors on invalid payloads.
- `index-node/menu.yaml` is the single source of truth for centre routes; do not hardcode URLs.
- For script hygiene, treat `scripts/CATALOG.md` as the quick map for `strict ctl` / `legacy ctl` / `wrapper ctl`.
- Sync helper scripts are canonical in `scripts/sync-utils/`; `scripts/utils/` is compatibility/fallback wrapper space and should not be the feature target.
- When touching multi-writer pipelines (Core4, Door, Fruits, Fire), add/maintain documentation and code comments that explain:
  - source of truth vs derived/cache artifacts
  - writers/readers and how they converge (pull/push triggers, throttling, idempotency)
  - safety rules (what must never be overwritten; what is rebuildable)
  - quick debug/runbook commands (curl/ctl helpers)
- Prefer a single "mental model" doc per system and link to it from component READMEs (see `DOCS/DOC_SYSTEM.md`).

## Testing Guidelines
- No automated test suite is configured; rely on smoke checks.
- Example checks: `curl http://127.0.0.1:8799/health` and `curl http://127.0.0.1:8080/bridge/core4/today`.
- For `scripts/*ctl` changes, run `scripts/scripts-lint.sh` and at least `bash -n` on changed scripts.
- For public access, use Tailscale funnel on `/bridge` and set GAS `LAPTOP_URL` to `https://<host>.ts.net/bridge`.
- Telegram Mini App URL: `https://ideapad.tail7a15d6.ts.net/tele.html` (BotFather domain: `https://ideapad.tail7a15d6.ts.net`).
- Prefer `bridge/selftest.py` when port binding is unavailable.
- Heartbeat is a standalone systemd user timer written by `scripts/heartbeat` (routerctl only wraps it).

## Commit & Pull Request Guidelines
- Commit messages are short and imperative (e.g., “Fix Door Hot List title parsing”).
- PRs should include a concise summary, affected components/routes, and screenshots for UI changes.

## Codex Sessions & Branch Hygiene
- Prefer one git branch per Codex session (so `resume` shows the correct branch context).
- Base branches live under `centre/*` (e.g. `centre/game-standalone`, `centre/index-node-game`).
- For fish jump-shortcuts, keep using `scripts/aos-aliasctl` and the helper `scripts/codexsess`:
  - `scripts/codexsess new game multiuser-drive` (creates `sess/...` branch + a `cx_*` alias to switch back)
  - `scripts/codexsess alias syncctl main` (creates `cx_syncctl` -> `git switch main`)
- Keep this shortcut registry maintained as part of normal session creation.

## Configuration & Secrets
- Use `.env` files for the router and `systemd/aos.env.example` for service env layout.
- Bridge auth: set `AOS_BRIDGE_TOKEN` (and optionally `AOS_BRIDGE_TOKEN_HEADER`) on both Bridge and GAS.
- Watchdog flow: HQ load triggers a session ping via `WATCHDOG_BOT_TOKEN` and `WATCHDOG_CHAT_ID`; offline/online alerts come from `watchdogCheck`.
- Keep secrets out of git; document required vars in component READMEs or AGENTS.
- Telegram tokens: never share one bot token across multiple consumers (e.g. Router polling + GAS webhook/polling).
- Apps Script ops: functions show up in the editor Run dropdown only if they are top-level (this repo often uses a trailing `_` for internal helpers; add public wrappers for admin actions).
- To send messages/links/blocks to your phone:
  - `tele <text>` (raw sender)
  - `telectl ...` (wrappers: fire/blueprint/bridge/router)
- Use `scripts/aos-aliasctl` (or `aos-aliasctl` on PATH) to add/manage aliases.
