# Taskwarrior in AlphaOS (AOS)

Diese Notiz beschreibt **wie Taskwarrior im AlphaOS-System benutzt wird**, ohne es an andere Systeme “anzugleichen”.

## Grundsätze

- **Taskwarrior ist der lokale Ursprung** für Tasks (UUID-first).
- **Centres sind Tags**, nicht Projects.
- **Domains sind Tags** (Body/Being/Balance/Business), damit Queries und Sync-Trigger eindeutig sind.
- **TickTick Sync** nutzt Tags als Trigger/Identifier (mobile Oberfläche), ohne die lokale Wahrheit zu ersetzen.

## Begriffe (AlphaOS)

- **Domain**: `body | being | balance | business` (als Tags `+body/+being/+balance/+business`)
- **Centre**:
  - Door Centre (Hot List, Door War, War Stack, Profit …) → Tag `+door` (plus Pipeline-Tags)
  - Game Centre (Frame/Freedom/Focus/Fire/Tent overhead) → je nach Lane z.B. Tag `+fire` (und optional `+game`, falls gewünscht)
  - Core4 → Tag `+core4` (plus Habit-Tag)
- **Pipeline-Phase (Door)**: `+potential`, `+plan`, `+production`, `+hit`, `+profit`, `+warstack` …

## Project vs Tags

AlphaOS kann Projects so verwenden, dass es **nicht redundant** wird:

- **Door** als *eigenes* `project:"<DoorName>"` (z.B. `project:"Vitaltrainer Module 6"`), plus Tags: `+door +plan +business` usw.
- **Core4**: Project ist optional/sekundär; wichtig ist `+core4` + Habit-Tag + Domain-Tag.

Wenn du sowas wie `project:Body.Core4` verwendest, ist das ein *zusätzlicher* Ordnungs-Layer (optional). Die “Lane” bleibt trotzdem über Tags abbildbar: `+body +core4`.

## Core4: “Done” Tracking ohne Overlaps

Ziel: **pro Habit pro Tag nur einmal zählen**, egal ob der Abschluss aus TickTick/GAS/Telegram/Taskwarrior kommt.

**Bridge JSON (wöchentliche Datei):**
- Pfad: `~/AlphaOS-Vault/Alpha_Core4/core4_week_YYYY-W##.json`
- Eintrag-Schlüssel: `date+domain+task` (idempotent; Quellen werden zusammengeführt)
- Score: `done => 0.5 Punkte`, sonst `0.0` (keine Doppelzählung möglich)

**Endpoints:**
- `POST /bridge/core4/log` (schreibt/merged)
- `GET /bridge/core4/today` (heutiger Score)
- `GET /bridge/core4/week?week=YYYY-W##` (Wochen-JSON)

**Taskwarrior Hook (wenn Core4-Task done):**
- Hook: `scripts/taskwarrior/on-modify.alphaos.py` (sendet Core4 log payload an die Bridge)

## Daily Fire Map (“Daily Board”)

Daily Fire Map ist eine **Query-Ansicht** (für “heute”), typischerweise über Tags + Datumsfelder:

- Tags: `+fire +production +hit` (und Domain-Tag)
- Datum: `scheduled` und/oder `due` in “heute” Range

Index Node stellt dafür APIs bereit:
- `GET /api/fire/day` (Taskwarrior primary, TickTick fallback)
- `GET /api/fire/week`

## Task Export Snapshot (Zwischenspeicher)

Für Bots/UIs ist ein JSON Snapshot hilfreich (schnell lesbar, kein `task export` pro Request):

- Default: `~/.local/share/alphaos/task_export.json`
- Optionaler Vault-Copy: `~/AlphaOS-Vault/.alphaos/task_export.json`

Tools:
- `scripts/taskwarrior/export-snapshot.sh` (schreibt Snapshot + optional Vault-Copy)
- `scripts/setup-task-export.sh` (systemd user timer für periodische Updates)

## Nützliche Queries (als Beispiele)

- Door Hot List: `task project:HotList +potential list`
- Alle Door-Tasks einer Domain: `task +door +business list`
- Aktive War Stack Tasks: `task +warstack list`
- Fire heute (Tag-basiert): `task +fire +hit +production due:today list` (wenn du `due` nutzt)
- Core4 heute (Tag-basiert): `task +core4 due:today list`

