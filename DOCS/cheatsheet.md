# AOS Hub Cheatsheet

Quick reference for commands, endpoints, and script properties.

## Local Endpoints (Index Node)

UI routes:
- `GET /menu`
- `GET /door` `GET /game` `GET /tent` `GET /generals`
- `GET /game/frame` `GET /game/freedom` `GET /game/focus` `GET /game/fire`

Core APIs:
- `POST /api/hotlist`
- `POST /api/core4`
- `GET /api/core4/today`
- `POST /api/tele/send`

Fruits:
- `GET /api/fruits`
- `GET /api/fruits/users`
- `POST /api/fruits/register`
- `POST /api/fruits/next`
- `POST /api/fruits/answer`
- `POST /api/fruits/skip`
- `POST /api/fruits/export`

Vault content:
- `GET /api/door/chapters`
- `GET /api/game/chapters`
- `GET /api/voice/history`
- `GET /api/voice/file`
- `POST /api/voice/autosave`

Taskwarrior bridge:
- `GET /api/taskwarrior/tasks`
- `POST /api/taskwarrior/add`
- `POST /api/taskwarrior/push`
- Taskwarrior hooks: `scripts/setup-alpha-hooks.sh` + set `AOS_HOOK_TARGET=bridge` in `~/.config/alpha-os/hooks.env`
 - AlphaOS Taskwarrior notes: `DOCS/taskwarrior-alphaos.md`
 - Taskwarrior on-exit snapshot hook: `scripts/setup-alpha-on-exit-hook.sh`
 - GAS: set Script Property `AOS_TASK_EXPORT_FILE_ID` to the Drive file id for `AlphaOS-Vault/.alphaos/task_export.json`

Exports:
- `POST /api/door/export`
- `POST /api/game/export`
- `POST /api/voice/export`
- `POST /api/generals/report`
- `GET /api/generals/latest`
- `GET /api/centres`

Health:
- `GET /health`

indexctl:
- `scripts/indexctl install`
- `scripts/indexctl start|stop|restart|status|logs`
- `scripts/indexctl env`

hubctl:
- `hubctl doctor`
- `hubctl bridge <cmd>`
- `hubctl router <cmd>`
- `hubctl index <cmd>`
- `hubctl sync <cmd>`
- `hubctl fire setup|enable|disable|status|list|run|logs`

Core4 utilities (scripts/):
- `scripts/core4_done_wrapper.py "Fuel done"`
- `scripts/core4_score.py`

Firemap canvas (scripts/):
- `scripts/gen_firemap_canvas.sh`
- `scripts/gen_firemap_daily_canvas.sh`

syncvaultctl:
- `scripts/syncvaultctl` (status overview)
- `scripts/syncvaultctl sync` (safe sync all)
- `scripts/syncvaultctl pull` (safe pull all)
- `scripts/syncvaultctl menu` (simple menu)
- `scripts/syncvaultctl advanced` (advanced menu)
- `scripts/syncvaultctl log` (last 10 pushed files per domain)
- `scripts/syncvaultctl vault-sync` (git auto-sync)
- `scripts/syncvaultctl vitaltrainer-sync` (git auto-sync)
- `scripts/syncvaultctl fadaro-sync` (git auto-sync)

Env files (envctl):
- `~/.env/bridge.env`
- `~/.env/alphaos-index.env`

## Bridge Service (aiohttp :8080)

- `GET /health`
- `POST /bridge/core4/log`
- `GET /bridge/core4/today`
- `GET /bridge/core4/week?week=YYYY-Wxx`
- `POST /bridge/fruits/answer`
- `POST /bridge/tent/summary`
- `POST /bridge/sync/push`
- `POST /bridge/sync/pull`

bridgectl:
- `bridge/bridgectl status`
- `bridge/bridgectl health`
- `bridge/bridgectl debug`
- `bridge/bridgectl tailscale`
- `bridge/bridgectl enable`

Bridge env (systemd):
- `AOS_RCLONE_REMOTE=eldanioo:/AlphaOS-Vault`
- `AOS_RCLONE_SUBDIRS=Core4,Voice,Door,Game`
- `AOS_BRIDGE_QUEUE_DIR=~/.cache/alphaos/bridge-queue`
- `AOS_BRIDGE_FALLBACK_TELE=1`

## Repo Scripts

| Script | Purpose |
| --- | --- |
| `scripts/alphaos.zsh` | Shell helpers / aliases |
| `scripts/aos-doctor` | Health report (router/bridge/index) |
| `scripts/indexctl` | Index Node unit control |
| `scripts/setup-alpha-hooks.sh` | Task + git hooks |
| `scripts/setup-task-export.sh` | Taskwarrior export snapshot timer |
| `scripts/setup-fire-map.sh` | Fire Map bootstrap |
| `scripts/syncvaultctl` | Unified sync CLI |
| `scripts/taskwarrior/` | Taskwarrior hooks |
| `scripts/taskwarrior/export-snapshot.sh` | Write `task export` JSON snapshot |

Rclone timers (templates, not installed by default):
- `aos-vault-push-eldanioo.timer` (daily 03:30) -> `eldanioo:MeineAblage/AlphaOS-Vault`
- `dokumente-push-fabian.timer` (weekly Sun 04:00) -> `fabian:MeineAblage/Dokumente`

## HQ Terminal Commands (GAS WebApp)

Opens centres:
- `door` `voice` `game` `frame` `freedom` `focus` `fire` `tent`

## Telegram Commands (GAS Bot)

Router:
- `/warstack` `/voice` `/firemap` `/frame` `/help` `/status`

Bridge:
- `/sync` `/hot` `/hit` `/done`

WebApp:
- `/webapp` `/report`

Fruits:
- `/facts` (or `/fruits`) `/web` `/next` `/skip`

## Script Properties (GAS)

Centre URLs:
- `CREATOR_WEBAPP_URL`
- `FRUITS_WEBAPP_URL`
- `ALLMYLINKS_URL`
- `VOICE_URL`
- `WORDPRESS_URL`
- `DOOR_URL`
- `DOOR_CENTRE_URL`
- `GAME_URL`
- `FADARO_URL`
- `FRAME_MAP_URL`
- `FREEDOM_MAP_URL`
- `FOCUS_MAP_URL`
- `FIRE_MAP_URL`
- `TENT_MAP_URL`

Fruits:
- `FRUITS_BOT_TOKEN`
- `FRUITS_WEBHOOK_URL`
- `FRUITS_SHEET_ID`
- `FRUITS_DRIVE_FOLDER_ID`
- `FRUITS_DEFAULT_CHAT_ID`

Bot core:
- `BOT_TOKEN`
- `ALPHAOS_BOT_TOKEN`
- `TELEGRAM_BOT_TOKEN`
- `CHAT_ID`

## Core4 Summary

- 8 habits per day, 4 points daily, 28 points weekly.
- Weekly summary functions: `core4_buildWeeklyReportText`, `core4_exportWeekSummaryToDrive`,
  `core4_weeklySummaryAutomation`.
