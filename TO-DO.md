# aos-hub — Aufgabenliste

Status: `[ ]` offen · `[~]` in Arbeit · `[x]` erledigt · `[?]` unklar/blockiert

---

## 🔴 Kritisch / Datenintegrität

- [x] **server.js:1850 — scanForCore4Metrics falscher Pfad** (erledigt Opus-Session 2026-03-28)

---

## 🟡 Architektur / Refactoring

> **Vollständige Analyse:** `index-node/AGENTS.md` § "🚨 ARCHITECTURAL DEBT: Multi-Server in Single package.json"
> 5 unabhängige Node-Server, 1 package.json, 7753 Zeilen — inkl. Refactoring-Optionen A/B/C

> **Architektur-Entscheidung:**
> Bridge (Python) = alles was schreibt, Python aufruft, Sync
> Index-Node (Node) = alles was liest, JSON serviert, Frontend, menu.yaml
> Node ruft NIE Python direkt auf — nur über Bridge

- [ ] **Index-Node: alle Write-Endpoints → Bridge delegieren**
  - `/api/core4/log` → `POST http://127.0.0.1:8080/bridge/core4/log`
  - Gleiches Prinzip für alle anderen Write-Endpoints in Index-Node
  - Lese-Endpoints (/today, /day-state, /week-summary) bleiben in Index-Node

- [ ] **PWA-Server: pwa-app-server.js durch standalone server ersetzen**
  - Aktuell: proxied `/api/*` → Index-Node (runtime-abhängig, kein echter standalone)
  - Soll: jede App importiert ihre Route direkt (wie doorctx-server.js)
  - Template: `doorctx-server.js` → `import doorRouter from "./routes/door.js"`
  - Betrifft: core4, fire, focus, frame, freedom, game, fitness, memoirs

- [ ] **core4ctx-server.js bauen** (nach doorctx-server.js-Pattern)
  - `import core4Router from "./routes/core4.js"`
  - Port: 8728 · Service: pwa-core4.service

- [ ] **gamectx-server.js bauen** (fire + focus + frame + freedom zusammen)
  - fire, focus, frame, freedom gehören zum Game-Pillar → ein Server, Routen per App
  - Routen: routes/fire.js, routes/focus.js, routes/frame.js, routes/freedom.js

---

## 🟠 Service Units / Naming

- [ ] **pwa-*-ctx.service → pwa-*.service umbenennen**
  - `pwa-core4-ctx.service` → `pwa-core4.service`
  - `pwa-fire-ctx.service` → `pwa-fire.service`
  - `pwa-focus-ctx.service` → `pwa-focus.service`
  - `pwa-frame-ctx.service` → `pwa-frame.service`
  - `pwa-freedom-ctx.service` → `pwa-freedom.service`
  - `pwa-game-ctx.service` → `pwa-game.service`
  - `pwa-door-ctx.service` → `pwa-door.service`
  - `pwa-fitness-ctx.service` → `pwa-fitness.service`
  - `pwa-memoirs-ctx.service` → `pwa-memoirs.service`
  - Betrifft: pwactx, menu.yaml, server.js, aosctl, aos-node-tui, aos-node-watch, AGENTS.md

- [ ] **ExecStart in pwa-*-ctx.service Units umbiegen**
  - Aktuell: alle → `pwa-app-server.js` (Proxy)
  - Soll: jeweils eigener `*ctx-server.js` (standalone)
  - Abhängig von: standalone server bauen (siehe oben)

---

## 🔵 index-node Sofort-Maßnahmen (Option C aus AGENTS.md)

- [ ] **doorctx-server.js — klären: wird er genutzt oder löschen?**
  - Ist das Template für standalone server — aber läuft er produktiv?
  - Prüfen: systemd-Unit `aos-doorctx.service` aktiv?

- [ ] **core4-tty.js → aus index-node herauslösen**
  - CLI-Tool hat in einem Express-Server-Repo nichts verloren
  - Kandidat: `~/aos-hub/core4/` oder als Shell-Wrapper

- [ ] **pwa-app-server.js npm-Script ergänzen**
  - `"pwa-ctx": "node pwa-app-server.js"` in package.json
  - Damit sichtbar dass er existiert

---

## 🔵 Scripts / Tools

- [ ] **nodectl / indexctl — falschen systemd-Service korrigieren**
  - Spielen falschen Service ein (TO-DO Altlast)
  - `aos-index-dev.service` vermutlich legacy

- [ ] **bin/ Verzeichnis in aos-hub einrichten**
  - Ausführbare Skripte zentral sammeln statt über Root verteilt
  - Kandidaten: aosctl, hubctl, core4ctx.zsh, doorctx, gamectx, konsolectx, ...

- [ ] **dev-Kopien in .dotfiles/dev/aos-node/ aktuell halten**
  - menu.yaml, server.js, AGENTS.md, pwa-app-server.js dort ebenfalls auf 8728

---

## 🟢 Kleinigkeiten

- [x] **core4ctx.zsh — CTX_DEFAULT_URL korrigieren** (8788 → 8728)

- [ ] **hyprpolkitagent + hyprpaper** (system-scope, nicht aos-hub)

- [ ] **python-aiohttp-oauth für GAS-Auth prüfen** (`yay -S python-aiohttp-oauth`)

---

## ✅ Erledigt (diese Session)

- [x] Core4 Port 8781 → 8728 (pwactx, menu.yaml, server.js, aosctl, alphaos.zsh,
      pwa-app-server.js, pwa-core4-ctx.service, boot-notify-enhanced, aos-node-tui, aos-node-watch)
- [x] core4_paths.py → ~/.core4 (Opus-Session 2026-03-28)
- [x] bridge.env + core4.env separiert (Opus-Session 2026-03-28)
