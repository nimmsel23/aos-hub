- [x] Session Review (2026-02-26): `core4ctl` behavior end-to-end (shim + legacy commands + help + menu)
- [x] Session Review (2026-02-26): `core4` / `c4` / `c4d` / `wcore4` behavior and help consistency (bash + fish)
- [x] Session Review (2026-02-26): TTY dashboard behavior (bridge online/offline fallback, totals consistency)
- [x] Session Review (2026-02-26): PWA Core4 (`index-node/public/pwa/core4`) API assumptions + UX/habit-tracker scope
- [x] Session Review (2026-02-26): Taskwarrior integration (read-only checks, seeding, alias drift, project/tag assumptions)
- [x] Session Review (2026-02-26): Write findings + simplify docs/AGENTS ("Core4 is primarily a habit tracker")

## Session Findings (2026-02-26)

- `core4ctl` als Daily-Frontdoor bleibt verwirrend, auch nach Shim: gleiche Binärdatei enthält weiterhin Daily-UX + Ops/Systemd/Legacy-Mounts.
- `core4ctl menu --help` war kaputt (öffnete Dashboard statt Help); im Shim gefixt.
- `core4ctl week` (Taskwarrior-Backend via `due:thisweek`) ist auf diesem System mit `task 3.4.2` aktuell fehlerhaft (`'thisweek' is not a valid date...`).
- `core4ctl today` endet bei "No matches." mit Exitcode `1` (Taskwarrior-Verhalten) und ist damit für Skripte als Statusprobe unpraktisch.
- Bash/Fish unterscheiden sich non-interaktiv stark:
  - `bash -lc 'core4'` startet Dashboard-Loop (hängt bis Timeout)
  - `fish -lc 'core4'` beendet still (kein Output)
- Python-Score (`core4 -d/-w`) und `c4` filtern Fremd-/Test-Events inzwischen; Node/PWA/Bridge-aggregierte Totals zählen solche Events voraussichtlich weiterhin mit (z. B. `bridge_test`) und können daher abweichen.
- PWA ist funktional als Habit-Tracker brauchbar (8 Habits / Week rings), hängt aber vollständig an API-Totals aus `index-node/server.js`; dort fehlt derzeit eine strikte Core4-Entry-Filterung.
- `~/.config/bash/core4-aliases` war stark veraltet (falsche `core4ctl`-Pfade, Alias-Drift). Teilweise gefixt; Datei bleibt historisch gewachsen und wartungsintensiv.
- `aos-hub/core4/AGENTS.md` enthielt/enthält zu viel narrativen Text für eine Arbeitsanweisung; Guideline jetzt auf "habit tracker first" geschärft.

## Follow-up (recommended)

- [ ] `index-node/server.js`: Core4-Totals/Day-State nur aus gültigen Core4-Habits berechnen (Fremd-/Test-Events filtern)
- [ ] `bridge/app.py`: `/bridge/core4/today`-Totals ebenfalls auf gültige Core4-Habits begrenzen
- [ ] `core4-trackctl` Taskwarrior-`week` Query an Taskwarrior 3 syntax/report setup anpassen (oder explizit auf `wcore4` verweisen)
- [ ] Non-interactive Semantik für `core4` vereinheitlichen (bash/fish) oder klar dokumentieren
- [ ] `~/.config/bash/core4-aliases` ausmisten / in kleinere, getestete Aliasset-Dateien splitten

- [ ] `weekly_core4score.csv` exportieren (Tent-wochenbezogen) — nach General's Tent triggern, analog zur monatlichen CSV (Owner: Tent-Centre Route/Service, nicht `server.js`)
- [ ] Sealed Tent-Bundle schreiben: `generalstent_KW**.md` (Core4-Wochenscore + Tent-Synthese gebuendelt; in `index-node/routes/game.tent.js` / `index-node/services/tent.service.js`)
