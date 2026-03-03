# API Map

Purpose: fast map of runtime endpoints grouped by feature.

## Inventory Command

Use this to list route declarations directly from `server.js`:

```bash
rg -n "app\\.(get|post|put|delete)\\(\"/" server.js
```

## Core and Menu

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | health probe |
| `GET` | `/menu` | parsed `menu.yaml` links |
| `GET` | `/api/centres` | centre payload from menu |
| `GET` | `/api/doc` | doc endpoint for UI consumers |

## Redirects and Entrypoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/door` | redirect to `/door/` |
| `GET` | `/game/frame` | redirect to static page |
| `GET` | `/game/freedom` | redirect to static page |
| `GET` | `/game/focus` | redirect to static page |
| `GET` | `/game/fire` | redirect to static page |
| `GET` | `/tent` | redirect to `/game/tent` |
| `GET` | `/generals` | redirect to `/game/tent` |
| `GET` | `/tele` | redirect to `/tele.html` |

## Door

| Method | Path |
|---|---|
| `POST` | `/api/door/export` |
| `GET` | `/api/door/flow` |
| `GET` | `/api/door/hotlist` |
| `POST` | `/api/door/hotlist` |
| `POST` | `/api/door/doorwar` |
| `POST` | `/api/door/warstack/start` |
| `POST` | `/api/door/warstack/answer` |
| `GET` | `/api/door/warstack/:id` |
| `GET` | `/api/door/chapters` |

## Game (Fire, Focus, Export)

| Method | Path |
|---|---|
| `GET` | `/api/fire/tasks-day` |
| `GET` | `/api/fire/tasks-week` |
| `GET` | `/api/fire/week-range` |
| `POST` | `/api/game/export` |
| `GET` | `/api/game/focus/list` |
| `GET` | `/api/game/focus/load` |
| `GET` | `/api/game/focus/state` |
| `POST` | `/api/game/focus/state` |
| `GET` | `/api/game/chapters` |

## Tent

| Method | Path |
|---|---|
| `POST` | `/api/tent/init` |
| `GET` | `/api/tent/state/:domain` |
| `GET` | `/api/tent/states` |
| `GET` | `/api/tent/synthesis/domains` |
| `GET` | `/api/tent/synthesis/temporal` |
| `GET` | `/api/tent/synthesis/pipeline` |
| `GET` | `/api/tent/synthesis/complete` |
| `GET` | `/api/tent/component/return-report` |
| `GET` | `/api/tent/component/lessons` |
| `GET` | `/api/tent/component/corrections` |
| `GET` | `/api/tent/component/targets` |
| `POST` | `/api/tent/save-weekly` |

Note:
- `/game/tent` and `/game/tent/api` are served by `routes/game.tent.js`.

## Voice

| Method | Path |
|---|---|
| `POST` | `/api/voice/export` |
| `GET` | `/api/voice/history` |
| `GET` | `/api/voice/file` |
| `POST` | `/api/voice/autosave` |

## Fruits

| Method | Path |
|---|---|
| `GET` | `/api/fruits` |
| `GET` | `/api/fruits/users` |
| `POST` | `/api/fruits/register` |
| `POST` | `/api/fruits/next` |
| `POST` | `/api/fruits/answer` |
| `POST` | `/api/fruits/skip` |
| `POST` | `/api/fruits/export` |

## Core4

**Canonical endpoints** (use these – event-sourced, full response):

| Method | Path | Body / Query | Purpose |
|---|---|---|---|
| `GET` | `/api/core4/day-state` | `?date=YYYY-MM-DD` (opt) | Entries + total for one day |
| `GET` | `/api/core4/week-summary` | `?date=YYYY-MM-DD` (opt) | Week totals by domain + by day |
| `POST` | `/api/core4/log` | `{ domain, task, date?, source? }` | Log 0.5 pts; returns updated day+week |
| `GET` | `/api/core4/journal` | `?date=YYYY-MM-DD` (opt) | Journal entries for date |
| `POST` | `/api/core4/journal` | `{ domain, habit, text, date? }` | Save journal entry |
| `POST` | `/api/core4/export-week` | `{ date? }` | Export week summary to markdown |

**Legacy endpoints** (kept for GAS/TTY/bridge-compat, do not use in new code):

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/core4` | subtask-name mapper → core4Log + Taskwarrior sync + bridge |
| `GET` | `/api/core4/today` | legacy day state + bridge_total hybrid |

**Domains & tasks:**
- `body`: `fitness`, `fuel`
- `being`: `meditation`, `memoirs`
- `balance`: `person1`, `person2`
- `business`: `discover`, `declare`

Each task = 0.5 pts → domain max 1.0 → daily max 4.0 → weekly max 28.0

**Storage:** `~/.local/share/alphaos/core4/.core4/events/` (event ledger, append-only)

**UI:** `/pwa/core4/` — mobile-first PWA, uses canonical endpoints only.
Legacy route: `/core4` redirects to `/pwa/core4/`.

## Taskwarrior, Tele

| Method | Path |
|---|---|
| `POST` | `/api/journal` |
| `GET` | `/api/taskwarrior/tasks` |
| `POST` | `/api/taskwarrior/add` |
| `POST` | `/api/taskwarrior/push` |
| `POST` | `/api/tele/send` |

## Guardrails

- Keep JSON errors for invalid payloads.
- Keep `menu.yaml` as SSOT for menu link discovery.
- If adding new route families, document them here and in `file-map.md`.
