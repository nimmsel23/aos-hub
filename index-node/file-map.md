# File Map

Purpose: make the `index-node` folder navigable without opening random files.

## Top-Level Map

| Path | Role | Status |
|---|---|---|
| `server.js` | Main Express server, static serving, most API endpoints | active |
| `menu.yaml` | Menu SSOT for HQ links | active |
| `public/` | Frontend pages and shared JS/CSS | active |
| `routes/` | Extracted route modules (`/game/tent`) | active |
| `services/` | Service layer (tent + bridge client) | active |
| `lib/` | Utility modules (cache/week helpers) | active |
| `data/` | Data payloads (`fruits_questions.json`) | active |
| `scripts/` | Ops scripts (vault sync, task sync map hooks) | active |
| `TENT_ARCHITECTURE.md` | Historical/extended Tent notes | reference |
| `CHANGELOG_FOCUS_CENTRE.md` | Historical focus-centre notes | reference |
| `node_modules/` | dependencies | generated |
| `aos.env` | symlink to shared env file | infra |
| `bridge`, `router` | symlinks to sibling services | infra |

## Public UI Map

| Path | Route |
|---|---|
| `public/index.html` | `/` |
| `public/door/index.html` | `/door` (redirect to trailing slash) |
| `public/door/potential.html` | `/door/potential` style flow |
| `public/door/plan.html` | Door War / plan flow |
| `public/door/production.html` | War Stack / production flow |
| `public/door/profit.html` | Profit flow |
| `public/game/index.html` | `/game` |
| `public/game/frame.html` | `/game/frame` |
| `public/game/freedom.html` | `/game/freedom` |
| `public/game/focus.html` | `/game/focus` |
| `public/game/fire.html` | `/game/fire` |
| `public/game/tent.html` | `/game/tent` |
| `public/voice/index.html` | `/voice` |
| `public/facts.html` | `/facts` |
| `public/core4.html` | `/core4` |
| `public/tele.html` | `/tele` |

## Code Ownership Map

| Concern | Primary files |
|---|---|
| Menu loading and centre payload | `server.js`, `menu.yaml` |
| Door API | `server.js` |
| Game export/focus/fire API | `server.js` |
| Voice API | `server.js` |
| Core4 API | `server.js` |
| Fruits API | `server.js`, `data/fruits_questions.json` |
| Tent bundle API | `routes/game.tent.js`, `services/tent.service.js`, `services/bridge.client.js` |
| Week and cache helpers | `lib/week.js`, `lib/cache.js` |

## Cleanup Notes

- Empty tracked artifacts `alphaos-index-node@1.0.0` and `nodemon` were removed on 2026-02-12.
- Keep symlink usage (`aos.env`, `bridge`, `router`) explicit in ops docs to avoid confusion.
