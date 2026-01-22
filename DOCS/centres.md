# Centres Index (GAS + Node)

Single place to answer: “What is this centre?”, “Where is it implemented?”, “Where does it store data?”, and “What config does it need?”.

## URLs

- **GAS WebApp**: `https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec`
  - Pages via `?page=<key>` in `gas/entrypoints.gs` (e.g. `?page=door`).
- **Node Index**: `http://127.0.0.1:8799/` (menu + local APIs)

## Quick Table

| Centre | GAS page | Node URL | Primary storage (GAS) | Primary storage (Node) | Notes |
|---|---|---|---|---|---|
| **HQ** | (default) | `/` | Drive + Script Props + Sheets | N/A | HQ is the GAS “shell”; it embeds Quick Add + inline centres. |
| **Door** | `?page=door` | `/door` (menu-defined) | `Alpha_Door/{1-Potential,2-Plan,3-Production,4-Profit,0-Drafts}` | Vault/Taskwarrior (implementation-specific) | 4P flow. War Stack can enqueue tasks to Bridge. |
| **Hot List** | (HQ widget) | (usually under Door) | `Alpha_Door/1-Potential` + `hotlist_index.json` | Taskwarrior + TickTick hooks | Entry function: `hotlist_addWeb()` in `gas/hotlist.gs`. |
| **Door War** | (HQ inline + Door tab) | (usually under Door) | `Alpha_Door/2-Plan` (+ DoorWar MD saved via `saveDoorEntry`) | N/A | Drag&Drop matrix picks a Domino Door and can move Potential→Plan. |
| **War Stack** | (Door tab) | (separate bot / UI) | `Alpha_Door/3-Production` (+ drafts in `0-Drafts`) | Taskwarrior + TickTick | Saves MD and optionally pushes Telegram + task queue → Bridge. |
| **Hit List** | (Door tab) | N/A | `Alpha_Door/3-Production` | Taskwarrior | Built from War Stack hits. |
| **Profit** | (Door tab) | N/A | `Alpha_Door/4-Profit` (+ JSON) | Vault | Weekly review / done log. |
| **Core4** | `?page=core4` | `/core4` | Drive weekly JSON in `Alpha_Core4` + Sheet `Core4_Log` | local store (core4 TTY) | GAS: `core4_log()`/`core4_getToday()` in `gas/core4.gs`. Router bot has Taskwarrior shortcuts. |
| **Voice** | `?page=voice` | `/voice` | `Alpha_Voice` | Vault | Phase-based journaling, exports to MD. |
| **Fruits** | (HQ section) | `/facts` | `Alpha_Fruits` | Vault (`Game/Fruits`) | Daily Q/A map with export. |
| **Game** | (HQ section) | `/game` | mixed (Drive folders per map) | Vault (`Game/*`) | Node groups Frame/Freedom/Focus/Fire/Tent. |
| **Frame** | `?page=frame` | `/game/frame` | `Alpha_Frame` (if used) | Vault (`Game/Frame`) | Part of “Game” family. |
| **Freedom** | `?page=freedom` | `/game/freedom` | `Alpha_Freedom` (if used) | Vault (`Game/Freedom`) | Part of “Game” family. |
| **Focus** | `?page=focus` | `/game/focus` | `Alpha_Focus` (if used) | Vault (`Game/Focus`) | Part of “Game” family. |
| **Fire** | `?page=fire` | `/game/fire` | `Alpha_Fire` (if used) | Taskwarrior + Vault (`Game/Fire`) | There is also a standalone python firemap bot (auxiliary). |
| **Tent** | `?page=tent` | `/game/tent` | `Alpha_Tent` | Vault (`Game/Tent`) | Weekly review / exports. |

## Implementation Pointers

- **GAS routing**: `gas/entrypoints.gs` (`doGet` switch on `?page=`).
- **GAS HQ docs**: `DOCS/gas/hq.md`.
- **GAS centre docs**: `DOCS/gas/*.md`.
- **Node centre docs**: `DOCS/node/README.md`.
- **Desktop centres launcher**: `DOCS/aos-centres.md` (menu.yaml-driven).

## Configuration Cheat Sheet

**GAS Script Properties (most used):**
- Bridge: `AOS_BRIDGE_URL` (+ optional auth header/value), health/heartbeat props used by HQ.
- Telegram: `TELEGRAM_BOT_TOKEN`/`BOT_TOKEN`, `CHAT_ID`.
- Door: `DOOR_DRIVE_FOLDER_ID`, `DOOR_LOG_SHEET_ID`, `WARSTACK_TELEGRAM`, `WARSTACK_BOT_TOKEN`.
- Core4: `CORE4_SHEET_ID` (auto-created if missing).
- TickTick: `TICKTICK_TOKEN` (+ optional project IDs).

**Node env (most used):**
- Server: `AOS_BRIDGE_URL`, `BRIDGE_TIMEOUT_MS`.
- Centres: see `DOCS/node/README.md` per-centre env blocks.

