# Core4 — wie das System funktioniert

Siehe auch: `aos-hub/DOCS/CORE4_SYSTEM.md` (end-to-end mental model, alle Komponenten, Datenfluss).

Core4 ist ein Habit‑Tracker (8 Habits / 4 Domains) mit einem einfachen Ziel: **pro Tag 4 Punkte** (8×0.5) und daraus **28 pro Woche**.

Wichtig: Core4 ist in AlphaOS so gebaut, dass **mehrere Quellen** (lokal CLI/Taskwarrior, Bridge, GAS/WebApp) schreiben können, ohne dass Einträge verloren gehen oder doppelt zählen.

---

## 1) Was ist die “Wahrheit”?

**Source of truth ist ein append‑only Event‑Ledger**: pro “done” entsteht genau **eine Event‑JSON**.

- Lokal: `~/AlphaOS-Vault/Core4/.core4/events/YYYY-MM-DD/*.json`
- GDrive‑Mount (von GAS): `~/AlphaOS-Vault/Alpha_Core4/.core4/events/YYYY-MM-DD/*.json`

Jedes Event hat u.a.:
- `date` (YYYY-MM-DD), `domain` (body/being/balance/business), `task` (habit)
- `done=true`, `points=0.5`
- `key = YYYY-MM-DD:domain:task` (**Dedup-Key**)

**Dedupe-Regel:** Auch wenn mehrere Events (verschiedene Quellen) denselben `key` erzeugen, zählt der Tag **nur einmal**.

---

## 2) Welche Dateien werden daraus gebaut?

Aus den Events werden **Derived Artifacts** rebuildet (jederzeit neu generierbar):

- Tages-Snapshot: `~/AlphaOS-Vault/Core4/core4_day_YYYY-MM-DD.json`
- Wochen-Snapshot: `~/AlphaOS-Vault/Core4/core4_week_YYYY-WWW.json`

Für Chronik/Analyse gibt’s CSVs:

- Rolling Daily (letzte ~8 Wochen): `~/AlphaOS-Vault/Core4/core4_daily.csv`
- Monatsabschluss (1 Zeile pro Tag): `~/AlphaOS-Vault/Core4/core4_YYYY-MM.csv`

---

## 3) Welche Schreibwege gibt es?

### A) Lokal (CLI)
- Command: `core4 <habit>` (z.B. `core4 fitness`, optional backfill: `core4 fitness -1d`)
- Engine: `~/aos-hub/python-core4/tracker.py`
- Effekt:
  - schreibt (direkt oder via Bridge) Core4‑Events
  - rebuildet Day/Week JSON
  - optional Taskwarrior‑Task create+done (für TickTick/Sync-Flows)

### B) Taskwarrior Hook → Bridge
Wenn ein Core4‑Task in Taskwarrior completed wird, schreibt der Hook ein Core4‑Event:
- Hook: `~/.task/hooks/on-modify.99-alphaos.py`
- Ziel: `POST /bridge/core4/log` (Bridge)
- Fallback: wenn Bridge down ist, wird lokal ein Event geschrieben.

### C) GAS WebApp / Core4 Centre (GDrive)
GAS schreibt Events in Drive (Alpha_Core4). Die Wochen/Tages‑Snapshots sind **derived** und werden lokal aus dem Ledger rebuildet:
- GAS Code: `aos-hub/gas/core4.gs`
- Drive Folder: `Alpha_Core4/.core4/events/...`

### D) Bridge (aiohttp, localhost:8080)
Bridge nimmt Logs an und schreibt Events + rebuilds:
- Endpoint: `POST /bridge/core4/log`
- Service: `aos-hub/bridge/app.py`

---

## 4) Scoring / Anzeige

### Day
- `core4 -d` zeigt Tages-Score plus erledigte Habits.

### Week
- `core4 -w` zeigt Wochen-Score plus pro Datum die erledigten Habits.

Intern rebuildet `core4` aus den Events, deduped via `key`.
Wichtig: Scoring ist **read-only** (schreibt keine Snapshot-Dateien).

Wenn du Snapshot-Dateien explizit neu schreiben willst:
- `core4 build` (schreibt `core4_day_*.json` + `core4_week_*.json` aus dem Ledger)

---

## 5) Taskwarrior (nur “Integration”, nicht Truth)

Taskwarrior ist **nicht** die Wahrheit für Score (das ist das Event‑Ledger), sondern ein Integrations‑Transport:

Core4 Tasks werden aktuell so erzeugt:
- `project:<habit>` (z.B. `project:fitness`)
- `tags: <habit> core4_YYYYMMDD`
- `description: Core4 <habit> (YYYY-MM-DD)`

Damit sind Tasks minimal und trotzdem eindeutig dem Tag zuordenbar.

Reports:
- `task core` / `task core4`: heutige Core4 Tasks
- `task 28`: letzte 7 Tage completed Core4 Tasks (für Debug/Review)

---

## 6) TickTick Integration (optional)

TickTick-Sync läuft über `~/aos-hub/python-ticktick/ticktick_sync.py`:
- `--stdin` (on-add/on-modify hook) erstellt TickTick Task und schreibt UUID↔TickTick-ID mapping
- `--sync` kann TickTick→Taskwarrior done spiegeln (bei passenden TickTick tags)
- `--push` spiegelt Taskwarrior→TickTick done

Wichtig: TickTick ist **nicht** die Score-Wahrheit; Score kommt aus Events.

---

## 7) “Nachzügler” + Retention (kein JSON-Müll)

Du wolltest:
- bis zum Tent mit JSON arbeiten (Events + snapshots),
- aber keine 1‑Jahres‑Ansammlung.

Ansatz:
- **Events lokal nur ~8 Wochen behalten** (für Nachzügler / Sync-Lag):
  - `core4 prune-events --keep-weeks=8`
- Langzeit-Chronik über CSV (Monatsabschluss):
  - `core4 finalize-month YYYY-MM`

---

## 8) Optional: Automation (systemd user timers)

Units/Templates liegen in `aos-hub/systemd/` und werden nicht automatisch aktiviert.

Installieren:
- `aos-hub/python-core4/core4ctl install-timers`

Aktivieren (manuell):
- `systemctl --user daemon-reload`
- `systemctl --user enable --now core4-daily.timer core4-prune.timer core4-month-close.timer`

Timer:
- `core4-daily.timer`: `core4 export-daily --days=56`
- `core4-prune.timer`: `core4 prune-events --keep-weeks=8`
- `core4-month-close.timer`: schreibt den Vormonat als `core4_YYYY-MM.csv`

---

## 9) Troubleshooting

- **Score in CLI fehlt, obwohl GAS geloggt wurde**
  - Prüfen ob Mount da ist: `ls ~/AlphaOS-Vault/Alpha_Core4/.core4/events/YYYY-MM-DD/`
  - Dann `core4 -d` / `core4 -w` (recompute aus dem Ledger)

- **Doppelte Taskwarrior Tasks**
  - Score zählt trotzdem nicht doppelt (dedupe via `key`), aber Tasks kannst du mit `task 28` finden und manuell löschen.

- **Bridge down**
  - Hooks/CLI fallen auf lokales Event‑Writeback zurück; später kommt der Eintrag beim nächsten Sync/Push rüber.

---

## Referenzen (Code / Doku)

- Storage/Retention/Timer Details: `aos-hub/DOCS/CORE4_STORAGE_MODEL.md`
- CLI: `aos-hub/python-core4/tracker.py`, `aos-hub/python-core4/README.md`
- Bridge: `aos-hub/bridge/app.py`, `aos-hub/bridge/README.md`
- GAS Centre: `aos-hub/gas/core4.gs`, `aos-hub/gas/README.md`
- TickTick: `~/aos-hub/python-ticktick/ticktick_sync.py`
- Taskwarrior Hooks: `~/.task/hooks/on-add.core4`, `~/.task/hooks/on-modify.core4`, `~/.task/hooks/on-modify.99-alphaos.py`
