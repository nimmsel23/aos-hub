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

- [x] Local Tent prototype: `weekly_core4score.csv` wird im General's-Tent-Run erzeugt und aus `core4_week_YYYY-Www.json` geladen (manuell nur Fallback)
- [x] Local Tent prototype: sealed Bundle-Datei `generalstent_YYYY-KW**.md` + `generals_tent/generalstent_YYYY-Www.json`
- [ ] Index-Node Tent-Centre parity: gleiche Export-/Seal-Logik in `index-node/routes/game.tent.js` / `index-node/services/tent.service.js` umsetzen

## Session Findings (2026-02-27) - Storage / Archiv

- [ ] Core4 JSON storage policy finalisieren: klare Schreib-/Lese-Priorität fuer `core4_week_*.json` und `core4_day_*.json` (lokal vs Vault vs HQ) dokumentieren und im Code erzwingen
- [ ] Core4 archive hygiene: Retention/Prune fuer abgeleitete JSON/CSV-Dateien definieren (nicht nur Event-Ledger)
- [ ] Tent archive hygiene: `Game/Tent/_history/` und `Game/Tent/generals_tent/_history/` Retention/Rotation einführen
- [ ] Tent write safety: atomische Writes + einfache Locking-Strategie gegen parallele Runs (`tentctl weekly` mehrfach)
- [ ] Tent bundle traceability: Metadaten erweitern (welche Core4-Datei wurde genutzt, `habit` vs `domain` fallback, optional Hash/mtime)
- [ ] Naming parity fixieren: lokales `generalstent_YYYY-KW**.md` vs bestehende Index-Node-Namen (`generals_tent_YYYY-Www.md`, `tent_YYYY-Www.md`) auf eine dokumentierte Linie bringen
- [ ] Source coverage prüfen: Voice-/Door-Teile im Tent-Run sind weiterhin manuell; entscheiden ob APIs/Dateiquellen angebunden werden oder bewusst manuell bleiben
