# Index-Node Routes Inventory

Vollständige Route-Inventarliste für:
- `index-node/server.js` (HQ Runtime, i. d. R. Port `8799`)
- `index-node/pwa-server.js` (Standalone PWA Runtime, Port `8780`)
- alle gemounteten Router aus `index-node/routes/*.js`

Stand: aus aktuellem Quellcode extrahiert.

## Route-Quellen

- `index-node/server.js`
- `index-node/pwa-server.js`
- `index-node/routes/game.js`
- `index-node/routes/game.tent.js`
- `index-node/routes/door.js`
- `index-node/routes/fire.js`
- `index-node/routes/focus.js`
- `index-node/routes/freedom.js`
- `index-node/routes/frame.js`
- `index-node/routes/fitness-centre.js`
- `index-node/routes/core4.js`

## Runtime A: HQ (`server.js`, Port `8799`)

### Mounts / Middleware

- `USE /api` -> `pinBarrier` (`index-node/server.js:366`)
- `USE /pwa` -> static aus `PWA_DIR` (`index-node/server.js:370`)
- `USE /` -> static aus `public` (`index-node/server.js:372`)
- `USE /vendor/xterm` -> static (`index-node/server.js:387`)
- `USE /vendor/marked` -> static (`index-node/server.js:388`)
- `USE /game` -> `gameRouter` (`index-node/routes/game.js`) (`index-node/server.js:4570`)
- `USE /api/game` -> `gameApiRouter` (`index-node/routes/game.js`) (`index-node/server.js:4571`)
- `USE /api/fire` -> `fireRouter` (`index-node/routes/fire.js`) (`index-node/server.js:4572`)
- `USE /api/focus` -> `focusRouter` (`index-node/routes/focus.js`) (`index-node/server.js:4573`)
- `USE /api/freedom` -> `freedomRouter` (`index-node/routes/freedom.js`) (`index-node/server.js:4574`)
- `USE /api/frame` -> `frameRouter` (`index-node/routes/frame.js`) (`index-node/server.js:4575`)
- `USE /api/door` -> `doorRouter` (`index-node/routes/door.js`) (`index-node/server.js:4576`)
- `USE` `fitnessCentreRouter` (`index-node/routes/fitness-centre.js`) (`index-node/server.js:4577`)

### Direkte `app.*`-Routen in `server.js`

- `POST /api/pin/set` (`index-node/server.js:304`)
- `POST /api/pin/login` (`index-node/server.js:323`)
- `POST /api/pin/logout` (`index-node/server.js:340`)
- `GET /api/pin/status` (`index-node/server.js:349`)
- `GET /menu` (`index-node/server.js:4513`)
- `GET /api/aos/registry` (`index-node/server.js:4523`)
- `GET /api/pwa/gas-fallback` (`index-node/server.js:4580`)
- `GET /gas` (`index-node/server.js:4606`)
- `GET /generals` -> redirect `/game/tent` (`index-node/server.js:4599`)
- `GET /tent` -> redirect `/game/tent` (`index-node/server.js:4600`)
- `GET /pwa/core4` -> redirect `/pwa/core4/` (`index-node/server.js:4602`)
- `GET /pwa/fire` -> redirect `/pwa/fire/` (`index-node/server.js:4603`)
- `GET /pwa/focus` -> redirect `/pwa/focus/` (`index-node/server.js:4604`)
- `GET /pwa/freedom` -> redirect `/pwa/freedom/` (`index-node/server.js:4605`)
- `GET /pwa/frame` -> redirect `/pwa/frame/` (`index-node/server.js:4606`)
- `GET /core4` -> redirect `/pwa/core4/` (`index-node/server.js:4608`)
- `GET /core4/` -> redirect `/pwa/core4/` (`index-node/server.js:4609`)
- `GET /fire` -> redirect `/pwa/fire/` (`index-node/server.js:4610`)
- `GET /fire/` -> redirect `/pwa/fire/` (`index-node/server.js:4611`)
- `GET /focus` -> redirect `/pwa/focus/` (`index-node/server.js:4612`)
- `GET /focus/` -> redirect `/pwa/focus/` (`index-node/server.js:4613`)
- `GET /door` -> redirect `/door/` (`index-node/server.js:4614`)
- `GET /memoirs` -> redirect `/memoirs/` (`index-node/server.js:4615`)
- `GET /voice` -> redirect `/memoirs/` (`index-node/server.js:4616`)
- `GET /game/memoirs` -> redirect `/memoirs/` (`index-node/server.js:4617`)
- `GET /game/frame` -> redirect `/game/frame.html` (`index-node/server.js:4618`)
- `GET /game/freedom` -> redirect `/game/freedom.html` (`index-node/server.js:4619`)
- `GET /game/focus` -> redirect `/game/focus.html` (`index-node/server.js:4620`)
- `GET /game/fire` -> redirect `/game/fire.html` (`index-node/server.js:4621`)
- `GET /tele` -> redirect `/tele.html` (`index-node/server.js:4622`)
- `GET /gpt/:slug` (`index-node/server.js:4625`)
- `POST /api/generals/report` (`index-node/server.js:4635`)
- `GET /api/tent/week` (`index-node/server.js:4699`)
- `GET /api/fruits` (`index-node/server.js:4722`)
- `GET /api/fruits/users` (`index-node/server.js:4741`)
- `POST /api/fruits/register` (`index-node/server.js:4758`)
- `POST /api/fruits/next` (`index-node/server.js:4772`)
- `POST /api/fruits/answer` (`index-node/server.js:4807`)
- `POST /api/fruits/skip` (`index-node/server.js:4863`)
- `POST /api/fruits/export` (`index-node/server.js:4904`)
- `POST /api/door/export` (`index-node/server.js:4935`)
- `GET /api/door/flow` (`index-node/server.js:5057`)
- `GET /api/door/hotlist` (`index-node/server.js:5066`)
- `POST /api/door/hotlist` (`index-node/server.js:5075`)
- `POST /api/door/doorwar` (`index-node/server.js:5138`)
- `POST /api/door/warstack/start` (`index-node/server.js:5246`)
- `POST /api/door/warstack/answer` (`index-node/server.js:5309`)
- `GET /api/door/warstack/:id` (`index-node/server.js:5423`)
- `GET /api/fire/week` (`index-node/routes/fire.js`)
- `GET /api/fire/day` (`index-node/routes/fire.js`)
- `GET /api/fire/week-range` (`index-node/routes/fire.js`)
- `GET /fire/day` (`index-node/server.js`)
- `GET /fire/week` (`index-node/server.js`)
- `GET /fired` (`index-node/server.js`)
- `GET /firew` (`index-node/server.js`)
- `POST /api/game/export` (`index-node/server.js:5640`)
- `GET /api/game/focus/list` (`index-node/server.js:5784`)
- `GET /api/game/focus/load` (`index-node/server.js:5849`)
- `GET /api/game/focus/state` (`index-node/server.js:5875`)
- `POST /api/game/focus/state` (`index-node/server.js:5901`)
- `POST /api/voice/export` (`index-node/server.js:5949`)
- `POST /api/hotlist` (`index-node/server.js:5979`)
- `GET /api/core4/day-state` (`index-node/server.js:6008`)
- `GET /api/core4/week-summary` (`index-node/server.js:6024`)
- `POST /api/core4/log` (`index-node/server.js:6040`)
- `GET /api/core4/journal` (`index-node/server.js:6091`)
- `POST /api/core4/journal` (`index-node/server.js:6107`)
- `POST /api/core4/export-week` (`index-node/server.js:6126`)
- `POST /api/core4` (`index-node/server.js:6143`)
- `POST /api/journal` (`index-node/server.js:6226`)
- `GET /api/core4/today` (`index-node/server.js:6261`)
- `POST /api/tele/send` (`index-node/server.js:6295`)
- `GET /api/door/chapters` (`index-node/server.js:6314`)
- `GET /api/taskwarrior/tasks` (`index-node/server.js:6328`)
- `POST /api/taskwarrior/add` (`index-node/server.js:6370`)
- `POST /api/taskwarrior/push` (`index-node/server.js:6415`)
- `GET /api/voice/history` (`index-node/server.js:6477`)
- `GET /api/voice/file` (`index-node/server.js:6488`)
- `POST /api/voice/autosave` (`index-node/server.js:6508`)
- `GET /api/game/chapters` (`index-node/server.js:6528`)
- `GET /api/doc` (`index-node/server.js:6547`)
- `GET /api/generals/latest` (`index-node/server.js:6561`)
- `POST /api/tent/init` (`index-node/server.js:6602`)
- `GET /api/tent/state/:domain` (`index-node/server.js:6646`)
- `GET /api/tent/states` (`index-node/server.js:6668`)
- `GET /api/tent/synthesis/domains` (`index-node/server.js:6685`)
- `GET /api/tent/synthesis/temporal` (`index-node/server.js:6714`)
- `GET /api/tent/synthesis/pipeline` (`index-node/server.js:6743`)
- `GET /api/tent/synthesis/complete` (`index-node/server.js:6772`)
- `GET /api/tent/component/return-report` (`index-node/server.js:6812`)
- `GET /api/tent/component/lessons` (`index-node/server.js:6893`)
- `GET /api/tent/component/corrections` (`index-node/server.js:6954`)
- `GET /api/tent/component/targets` (`index-node/server.js:7018`)
- `POST /api/tent/save-weekly` (`index-node/server.js:7076`)
- `GET /api/centres` (`index-node/server.js:7108`)
- `GET /health` (`index-node/server.js:7118`)
- `GET /^\/([a-z0-9_-]+)$/` (single-segment slug fallback) (`index-node/server.js:7122`)

## Aufgelöste Mounted Router (HQ `8799`)

### `gameRouter` mount: `USE /game` (`index-node/server.js:4570`)

Quelle: `index-node/routes/game.js`

- `USE /game/tent/*` -> `tentRouter` (`index-node/routes/game.js:332`)

### `tentRouter` (über `gameRouter` unter `/game/tent`)

Quelle: `index-node/routes/game.tent.js`

- `GET /game/tent/` (`index-node/routes/game.tent.js:22`)
- `GET /game/tent/api` (`index-node/routes/game.tent.js:102`)

### `gameApiRouter` mount: `USE /api/game` (`index-node/server.js:4571`)

Quelle: `index-node/routes/game.js`

- `GET /api/game/frame/domains` (`index-node/routes/game.js:337`)
- `GET /api/game/frame/:domain` (`index-node/routes/game.js:363`)
- `POST /api/game/frame/:domain/save` (`index-node/routes/game.js:377`)
- `GET /api/game/freedom/year` (`index-node/routes/game.js:395`)
- `GET /api/game/freedom/:year/:domain` (`index-node/routes/game.js:410`)
- `POST /api/game/freedom/:year/:domain/save` (`index-node/routes/game.js:426`)
- `GET /api/game/focus/month` (`index-node/routes/game.js:460`)
- `GET /api/game/focus/:month/:domain` (`index-node/routes/game.js:475`)
- `POST /api/game/focus/:month/:domain/save` (`index-node/routes/game.js:495`)

### `doorRouter` mount: `USE /api/door` (`index-node/server.js:4576`)

Quelle: `index-node/routes/door.js`

- `GET /api/door/hotlist` (`index-node/routes/door.js:401`)
- `POST /api/door/hotlist` (`index-node/routes/door.js:411`)
- `DELETE /api/door/hotlist/:id` (`index-node/routes/door.js:433`)
- `POST /api/door/doorwar` (`index-node/routes/door.js:448`)
- `GET /api/door/warstacks` (`index-node/routes/door.js:515`)
- `POST /api/door/warstack/start` (`index-node/routes/door.js:529`)
- `POST /api/door/warstack/answer` (`index-node/routes/door.js:569`)
- `GET /api/door/warstack/:id` (`index-node/routes/door.js:647`)
- `GET /api/door/hits` (`index-node/routes/door.js:658`)
- `POST /api/door/hits/:id/toggle` (`index-node/routes/door.js:679`)
- `GET /api/door/hits/week` (`index-node/routes/door.js:727`)
- `GET /api/door/completed` (`index-node/routes/door.js:748`)
- `POST /api/door/reflection` (`index-node/routes/door.js:774`)
- `GET /api/door/reflections` (`index-node/routes/door.js:788`)

### `fireRouter` mount: `USE /api/fire` (`index-node/server.js:4572`)

Quelle: `index-node/routes/fire.js`

- `GET /api/fire/week` (`index-node/routes/fire.js`) (weekly tasks, Taskwarrior SSOT)
- `GET /api/fire/day` (`index-node/routes/fire.js`) (daily tasks, Taskwarrior SSOT)
- `POST /api/fire/toggle` (`index-node/routes/fire.js:448`)
- `POST /api/fire/rename` (`index-node/routes/fire.js:467`)
- `POST /api/fire/reorder` (`index-node/routes/fire.js:489`)

### `focusRouter` mount: `USE /api/focus` (`index-node/server.js:4573`)

Quelle: `index-node/routes/focus.js`

- `GET /api/focus/month` (`index-node/routes/focus.js:321`)
- `GET /api/focus/entry` (`index-node/routes/focus.js:356`)
- `POST /api/focus/entry/save` (`index-node/routes/focus.js:375`)
- `POST /api/focus/mission/save` (`index-node/routes/focus.js:398`)

### `freedomRouter` mount: `USE /api/freedom` (`index-node/server.js:4574`)

Quelle: `index-node/routes/freedom.js`

- `GET /api/freedom/year` (`index-node/routes/freedom.js:168`)
- `GET /api/freedom/domain` (`index-node/routes/freedom.js:195`)
- `POST /api/freedom/domain/save` (`index-node/routes/freedom.js:219`)

### `frameRouter` mount: `USE /api/frame` (`index-node/server.js:4575`)

Quelle: `index-node/routes/frame.js`

- `GET /api/frame/domains` (`index-node/routes/frame.js:249`)
- `GET /api/frame/domain` (`index-node/routes/frame.js:271`)
- `POST /api/frame/domain/save` (`index-node/routes/frame.js:288`)

### `fitnessCentreRouter` (ohne Prefix-Mount, direkt)

Quelle: `index-node/routes/fitness-centre.js`

- `GET /api/fitness-centre/status` (`index-node/routes/fitness-centre.js:45`)
- `GET /pwa/fitness` (`index-node/routes/fitness-centre.js:106`)
- `GET /pwa/fitness/*` (`index-node/routes/fitness-centre.js:106`)
- `POST /api/fitness-centre/tele/test` (`index-node/routes/fitness-centre.js:110`)

## Runtime B: Standalone PWA (`pwa-server.js`, Port `8780`)

### Static PWA App-Shells (Canonical + Alias)

- Canonical (preferred): `/pwa/<app>/` serves from `public/pwa/<app>/`
  - Apps: `core4`, `fire`, `focus`, `frame`, `freedom`, `door`, `game`, `memoirs`, `fitness`
- Alias (no `/pwa` prefix): `/<app>/` serves the same app-shells from `public/pwa/<app>/`
  - Added to survive Tailnet/Funnel setups that strip `/pwa` before proxying.

### Direct Routes in `pwa-server.js`

- `GET /api/pwa/gas-fallback` (`index-node/pwa-server.js`)
- `GET /health` (`index-node/pwa-server.js`)
- `GET /gas-fallback.js` (`index-node/pwa-server.js`) (alias to `public/pwa/gas-fallback.js`)

### Direkte `app.*`-Routen in `pwa-server.js`

- `GET /api/pwa/gas-fallback` (`index-node/pwa-server.js:82`)
- `GET /gas` (`index-node/pwa-server.js:113`)
- `GET /health` (`index-node/pwa-server.js:127`)

### Mounts in `pwa-server.js`

- `USE /api/game` -> `gameApiRouter` (`index-node/pwa-server.js:102`)
- `USE /api/core4` -> `core4Router` (`index-node/pwa-server.js:103`)
- `USE /api/fire` -> `fireRouter` (`index-node/pwa-server.js:104`)
- `USE /api/focus` -> `focusRouter` (`index-node/pwa-server.js:105`)
- `USE /api/freedom` -> `freedomRouter` (`index-node/pwa-server.js:106`)
- `USE /api/frame` -> `frameRouter` (`index-node/pwa-server.js:107`)
- `USE /api/door` -> `doorRouter` (`index-node/pwa-server.js:108`)
- `USE /` -> static aus `PUBLIC_DIR` (`index-node/pwa-server.js:111`)

### Zusätzliche Core4-Routen (nur Standalone, via `core4Router`)

Quelle: `index-node/routes/core4.js`

- `GET /api/core4/day-state` (`index-node/routes/core4.js:268`)
- `GET /api/core4/week-summary` (`index-node/routes/core4.js:280`)
- `POST /api/core4/log` (`index-node/routes/core4.js:292`)
- `GET /api/core4/today` (`index-node/routes/core4.js:348`)

## Hinweis zu Doppelungen

Einige Pfade existieren sowohl als direkte `app.get/post`-Route in `server.js` als auch über gemountete Router (z. B. Teile von `/api/fire` und `/api/door`). Für Laufzeitverhalten zählt in Express die Registrierungs-Reihenfolge.

## Auffälligkeiten

- Doppel-Definitionen in HQ (`server.js` vs. modulare Router) sind vorhanden:
  `GET/POST /api/door/hotlist`, `POST /api/door/doorwar`, `POST /api/door/warstack/start`,
  `POST /api/door/warstack/answer`, `GET /api/door/warstack/:id`.
- Dadurch ist das Ownership-Modell unscharf: dieselben API-Pfade haben mehr als eine Implementierungsstelle.
- Das Catch-all `GET /^\/([a-z0-9_-]+)$/` am Ende von `server.js` (`index-node/server.js:7122`) kann neue Top-Level-Routen ungewollt überdecken, falls deren Reihenfolge später verrutscht.
- Es existieren mehrere Legacy-/Alias-Pfade (`/fired`, `/firew`, diverse Redirects), was funktional ok ist, aber die API-Fläche unnötig verbreitert.

## Live-Checks (lokal)

- Datum: `2026-02-28`
- Verifiziert via `curl -sS` auf `127.0.0.1`:
  - `GET http://127.0.0.1:8799/health` -> `{"ok":true,"service":"index-centre"}`
  - `GET http://127.0.0.1:8780/health` -> `{"ok":true,"service":"pwa-standalone", ...}`
  - `GET http://127.0.0.1:8799/api/centres` -> `200 OK` mit Centres-JSON
