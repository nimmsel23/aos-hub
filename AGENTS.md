# Repository Guidelines

Das zugehörige `hubctl`-Skript wird aktiv von Codex bzw. Claude-Code verwendet und bei Bedarf weiterentwickelt.

## Project Structure & Module Organization
- `index-node/` is the local HQ web UI + API server (Node.js, port `8799`).
- `router/` is the Telegram router bot (aiogram) and extensions.
- `bridge/` is the aiohttp service (Core4/Fruits/Tent/task routing, port `8080`, optional token auth).
- `gas/` is a local symlink to a private GAS HQ workspace (typically `~/.gas/HQ`) and is treated as external/private.
- Pillars live at the repo root:
  - `core4/` (Core4 pillar; CLI lives in `core4/python-core4/`)
  - `door/` (Door pillar; tools live in `door/python-hot/`, `door/python-warstack/`, standalone GAS dev in `door/gas-door-dev/`)
  - `voice/` (Voice pillar)
  - `game/` (Game pillar container; sub-centres live in `game/fire/`, `game/focus/`, etc; bots live in `game/python-firemap/`, `game/python-tent-bot/`; Fruits GAS standalone is external at `~/.gas/fruits-dev`)
- `scripts/` and `systemd/` provide operational tooling and units (preferred entrypoint: `scripts/hubctl`).
- Domain ownership rule:
  - Pillar/domain logic lives inside the pillar directory (`door/`, `game/`, `voice/`, `core4/`).
  - `scripts/` is the orchestration/frontdoor layer and should avoid embedding pillar-specific business logic.
  - Legacy root-level scripts for pillar behavior should be migrated into the pillar folder and kept as wrappers only during transition.
- `DOCS/` is a portal + archive. SSOT pillar docs live in the pillar roots (see `DOCS/DOC_SYSTEM.md`).

## Build, Test, and Development Commands
- `cd index-node && npm install && npm start` starts the HQ server.
- `cd index-node && npm run dev` runs the HQ server with nodemon.
- `cd router && pip install -r requirements.txt && python router_bot.py` runs the Telegram router.
- `cd bridge && python app.py --host 0.0.0.0 --port 8080` runs the bridge.
- `./scripts/aos-doctor` or `./hubctl doctor` produces a multi-service health report.
- Runtime split policy:
  - `aosctl` = Production frontdoor (systemd system scope, `aos-*` units)
  - `hubctl dev` = Dev frontdoor (systemd user scope, `aos-*-dev` units)
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

## Registry Policy
- `registry.tsv` is the command inventory SSOT for discoverability and naming.
- Every user-facing command/frontdoor must have a `registry.tsv` entry (`id`, label, command, kind, source, description).
- When adding, moving, or renaming commands, update `registry.tsv` in the same change.
- Keep dispatch wiring and registry aligned:
  - `aosctl`/`hubctl` currently use explicit dispatch code (not automatic registry execution).
- If dispatch changes, update both code paths and `registry.tsv` together.
- Prefer extending existing entries over introducing parallel aliases with overlapping meaning.

## Frontdoor Wrapping Policy (Universal)
- Frontdoors (`aos`, `aosctl`, `hubctl`, pillar `*ctl`) should wrap user intent / domain phases first, not internal implementation names.
- Prefer phase/task-oriented entrypoints (example: `potential`, `plan`, `production`, `profit`) while keeping implementation details behind the wrapper.
- `aos` should expose short direct domain commands when they improve flow, even if they are implemented by a lower wrapper internally.
- Preferred pattern: `aos <domain-subcommand> ...` -> delegated to the canonical pillar frontdoor (`doorctl`, `gamectl`, etc.), rather than forcing users to type the lower-level tool name.
- Examples of the intended shape:
  - `aos hot list` -> wraps/delegates to Door tooling (via `doorctl`/Door pillar)
  - `aos frame new` -> wraps/delegates to Game Frame tooling (via `gamectl`/Frame centre)
- Keep this pattern consistent across pillars so parallel sessions/centres feel the same at the `aos` level (Door, Game, Voice, Core4, ...).
- Before wiring a new frontdoor command, verify the target is a real/canonical implementation (not a dummy/legacy placeholder). Do not assume wrapper scripts are authoritative.
- If unclear, inspect the pillar-local chapters/blueprints (including local symlinked chapter files) and then map to the existing pillar scripts/automation that already implement the behavior.
- For Door specifically, treat Chapter 26-30 (`Potential -> Plan -> Production -> Profit`) as the behavior model and wire frontdoors to the real Door automation/scripts first; keep Taskwarrior phase reports as explicit fallback (`<phase> report`), not the primary UX.
- It is acceptable for `aos` to wrap `doorctl` internally (or for `doorctl` to wrap lower-level scripts), but the user-facing command should avoid exposing unnecessary internal tool names.
- When replacing an assumed path with a real one during implementation, document the canonical path in help text and/or AGENTS comments so future refactors do not regress to dummy routes.

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
