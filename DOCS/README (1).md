# αOS Hub

Central infrastructure for the AlphaOS ecosystem. Primary HQ runs on the laptop (Node). GAS is the fallback HQ when the laptop is offline. Telegram routing + bridge + sync keep data flowing.

## Architecture (High-Level)

- **Primary HQ:** Index Node (local, `8799`) + `menu.yaml` (source of truth)
- **Telegram Router:** aiogram bot routes commands to centre URLs from the Index Node
- **Bridge:** aiohttp service on `8080` for Core4/Fruits/Tent data flow (and GAS forwarding)
- **GAS Single Project:** fallback HQ + bot + centres (Drive-hosted)
- **Sync:** rclone timers push Vault + Dokumente to Drive
- **Tailscale:** optional remote access to Index + Bridge

## Components

### 1) Index Node (Primary HQ)
Local web HQ + API for centres, exports, and data flow.

**Location:** `index-node/`
**Service:** `aos-index.service`
**Port:** `8799`

**Start:**
```bash
cd ~/aos-hub/index-node
node server.js
```

**UI routes:**
- `/` (HQ UI), `/door`, `/game`, `/tent`, `/game/frame`, `/game/freedom`, `/game/focus`, `/game/fire`

**Key APIs (selected):**
- `/menu`, `/api/centres`
- Door flow: `/api/door/flow`, `/api/door/hotlist` (GET/POST), `/api/door/doorwar`, `/api/door/warstack/start`, `/api/door/warstack/answer`, `/api/door/warstack/:id`, `/api/door/export`
- Game/Voice exports: `/api/game/export`, `/api/voice/export`
- Fruits: `/api/fruits`, `/api/fruits/next`, `/api/fruits/answer`, `/api/fruits/export`
- Core4: `/api/core4`, `/api/core4/today`
- Taskwarrior bridge: `/api/taskwarrior/tasks`, `/api/taskwarrior/add`, `/api/taskwarrior/push`
- Voice history: `/api/voice/history`, `/api/voice/file`, `/api/voice/autosave`

**Storage (Node defaults):**
- Door flow state: `~/AlphaOS-Vault/Door/.door-flow.json`
- Door exports: `~/AlphaOS-Vault/Door/{1-Potential,2-Plan,War-Stacks,3-Production,4-Profit}`
- Fruits store: `~/AlphaOS-Vault/Game/Fruits/fruits_store.json`
- Fruits questions: `index-node/data/fruits_questions.json`
- Core4 fallback: `~/.local/share/alphaos/drop/core4_today.json`
- Voice vault: `~/Voice` (fallback: `~/AlphaOS-Vault/VOICE`)

**Bridge integration:**
- If `AOS_BRIDGE_URL` is set, Core4 logs go to the bridge (`/bridge/core4/log`) and totals are read from `/bridge/core4/today`.

**Node env vars (common):**
- `HOST`, `PORT`, `MENU_YAML`
- `AOS_BRIDGE_URL` (or `BRIDGE_URL`)
- `DOOR_FLOW_PATH`, `DOOR_HITS_TICKTICK=1`, `DOOR_HITS_TAGS=door,hit,production`
- `FRUITS_QUESTIONS`, `FRUITS_DIR`, `FRUITS_STORE`
- `RCLONE_RC_URL`, `RCLONE_TARGET`, `RCLONE_FLAGS`, `RCLONE_BACKUP_TARGET`

**CLI:** `scripts/indexctl` (install/start/stop/restart/status/logs/env/doctor)

---

### 2) Router Bot (Telegram, aiogram)
Dumb Telegram router that fetches centre links from the Index Node and exposes `/door`, `/game`, etc.

**Location:** `router/`
**Service:** `aos-router.service`
**Config:** `router/config.yaml`, `router/.env`

**Highlights:**
- aiogram-based
- Pulls `/api/centres` from Index Node (supports Tailscale IPs)
- Extension system for extra commands
- Heartbeat + systemd helpers via `router/routerctl`

**CLI:** `router/routerctl` (unit management + heartbeat)

---

### 3) GAS Single Project (Fallback HQ + Bot)
Apps Script fallback when the laptop is offline. Also hosts the Telegram bot logic (webhook entrypoint), centre UIs, and Drive-based storage.

**Location:** `gas/` (snapshot for Apps Script editor)

Key files:
- `gas/alphaos_single_project.gs` (single backend)
- `gas/Index.html` + `gas/Index_client.html` + `gas/Index_style.html` (HQ UI)
- `gas/Door_Index.html` + `gas/Door_Client.html` + `gas/door.gs` (Door Centre)
- `gas/Game_*` + `gas/game_*.gs` (Frame/Freedom/Focus/Fire/Tent)
- `gas/fruits.gs` (Fruits centre + bot)
- `gas/core4.gs` (Core4 weekly log + summaries)
- `gas/config.gs` (Script Properties for centre URLs)

**Fallback routing:**
- The GAS HQ renders Maps inline (Door/Voice/Frame/Freedom/Focus/Fire/Tent) and Fruits inline.
- Map dots use Script Properties as fallback external links (if you want separate GAS projects).
- Per-page routing is available: `/exec?page=door|voice|frame|freedom|focus|fire|tent`.

**Core4 (GAS):**
- Weekly JSON is stored in Drive: `Alpha_Core4/core4_week_YYYY-W##.json`
- Sheet mirror auto-creates: `Alpha_Core4_Logsheet` (tab `Core4_Log`)
- Weekly summary export: `Alpha_Tent/core4_week_summary_YYYY-W##.md`

**Hot List (GAS):**
- Logs to sheets + writes `.md` into `Alpha_Door/1-Potential`
- Optional TickTick sync: set `HOTLIST_TICKTICK_PROJECT_ID` (fallback `TICKTICK_INBOX_PROJECT_ID`, then `inbox`)

---

### 4) Bridge Service (aiohttp)
Local data bridge for Core4/Fruits/Tent + GAS forwarding. Runs on `8080` and can be reached via Tailscale.

**Location:** `bridge/`
**Service:** `aos-bridge.service`

**Endpoints:**
See `bridge/README.md` (Core4, Fruits, Tent, task operation, queue + sync).

**CLI:** `bridge/bridgectl` (status/health/debug/tailscale/enable)

### systemd system units env (optional)

If you install the repo-shipped system units from `systemd/` into `/etc/systemd/system/`,
create `/etc/alphaos-hub/env` (see `systemd/alphaos-hub.env.example`) and set:
- `AOS_HUB_DIR` (absolute path to this repo checkout)
- `AOS_ENV_DIR` (directory containing `bridge.env`, `router.env`, `telegram.env`, `alphaos-index.env`, `alphaos-vault-sync.env`)

---

### 5) Sync (rclone + systemd)
Pushes Vault and Dokumente into Drive.

**Location:** `systemd/`
**Timers/Services:**
- `aos-vault-push-eldanioo.timer` → `eldanioo:MeineAblage/AlphaOS-Vault`
- `dokumente-push-fabian.timer` → `fabian:MeineAblage/Dokumente`

---

## Operations + Tooling

**Doctor / health:**
- `scripts/aos-doctor` (runs routerctl + bridgectl health checks)
- `hubctl doctor` (unified wrapper)

**Index Node control:**
- `scripts/indexctl` (systemd user unit + env + logs)

**Router control:**
- `router/routerctl` (install, unit management, heartbeat)

**Bridge control:**
- `bridge/bridgectl`

**Unified:**
- `hubctl` (wraps doctor/bridge/router/index/sync/fire)

**Scripts (repo):**

| Script | Purpose | Notes |
| --- | --- | --- |
| `scripts/alphaos.zsh` | Shell helpers / aliases | Source in your shell rc. |
| `scripts/aos-doctor` | Health report (router/bridge/index) | Single status snapshot. |
| `scripts/indexctl` | Index Node unit control | `install`, `restart`, `logs`, `env`. |
| `scripts/setup-alpha-hooks.sh` | Task hooks + git hooks | Taskwarrior → Bridge/GAS. |
| `scripts/setup-fire-map.sh` | Fire Map bootstrap | No pip, arch-friendly. |
| `scripts/core4_done_wrapper.py` | Core4 done helper | Marks today's Core4 task done. |
| `scripts/core4_score.py` | Core4 weekly score | Pulls Bridge JSON and writes `core4_score_<week>.json`. |
| `scripts/gen_firemap_canvas.sh` | Fire Map weekly canvas | Uses template file. |
| `scripts/gen_firemap_daily_canvas.sh` | Fire Map daily canvas | Uses template file. |
| `scripts/syncvaultctl` | Unified sync CLI | Menu + timers + domains. |
| `scripts/taskwarrior/` | Taskwarrior hooks | on-add / on-modify. |

**Taskwarrior hooks:**
- `scripts/taskwarrior/on-add.alphaos.py`
- `scripts/taskwarrior/on-modify.alphaos.py`

**External tools (from dotfiles):**
- `vaultctl` (Vault sync helpers)
- `scripts/syncvaultctl` (Unified sync control for git + rclone jobs)
- `envctl` (manages `~/.env/alphaos-*.env`)

---

## Tailscale
Optional but recommended for remote access to the local HQ and bridge. Typical setup uses:
- Index Node: `http://<tailscale-ip>:8799`
- Bridge: `http://<tailscale-ip>:8080`

---

## Repo Layout

- `index-node/` - Local HQ UI + API server
- `router/` - Telegram router bot (aiogram) + extensions
- `bridge/` - aiohttp bridge (Core4/Fruits/Tent + GAS forwarding)
- `gas/` - Apps Script fallback HQ + bot + centres
- `systemd/` - user services + timers
- `scripts/` - control scripts + hooks
- `DOCS/` - cheatsheet + notes

---

## Docs

- `DOCS/cheatsheet.md`
- `ROADMAP.md`
- `router/ARCHITECTURE.md`
- `bridge/README.md`

## License

MIT
