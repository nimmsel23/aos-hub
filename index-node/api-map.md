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
| `GET` | `/api/fire/day` |
| `GET` | `/api/fire/week` |
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

## Core4, Taskwarrior, Tele

| Method | Path |
|---|---|
| `POST` | `/api/core4` |
| `GET` | `/api/core4/today` |
| `POST` | `/api/journal` |
| `GET` | `/api/taskwarrior/tasks` |
| `POST` | `/api/taskwarrior/add` |
| `POST` | `/api/taskwarrior/push` |
| `POST` | `/api/tele/send` |

## Guardrails

- Keep JSON errors for invalid payloads.
- Keep `menu.yaml` as SSOT for menu link discovery.
- If adding new route families, document them here and in `docs/file-map.md`.
