# Taskwarrior in AlphaOS (AOS)

Diese Notiz beschreibt **wie Taskwarrior im AlphaOS-System benutzt wird**, ohne es an andere Systeme “anzugleichen”.

## Grundsätze

- **Taskwarrior ist der lokale Ursprung** für Tasks (UUID-first).
- **Centres sind Tags**, nicht Projects.
- **Domains sind Tags** (Body/Being/Balance/Business), damit Queries und Sync-Trigger eindeutig sind.
- **TickTick Sync** nutzt Tags als Trigger/Identifier (mobile Oberfläche), ohne die lokale Wahrheit zu ersetzen.

## Hooks (empfohlen)

- `on-add`: neue Tasks → Payload an Bridge/GAS/tele (UUID-first)
- `on-modify`: Änderungen + `done` → Payload an Bridge/GAS/tele; Core4 “done” → Core4 log
- `on-exit`: nach jeder Taskwarrior-Command → Export-Snapshot aktualisieren (für UIs/Bots, optional Vault→Drive)

Installer:
- `scripts/setup-alpha-hooks.sh` (on-add/on-modify, existing)
- `scripts/setup-alpha-on-exit-hook.sh` (on-exit Snapshot)

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
 - `scripts/setup-alpha-on-exit-hook.sh` (Taskwarrior on-exit Hook; aktualisiert Snapshot nach jeder Task-Aktion)

## GAS: Snapshot aus Drive lesen

Wenn dein Vault nach Google Drive synchronisiert wird, kann GAS den Snapshot direkt aus dem Drive-Ordner `AlphaOS-Vault` lesen.

**Empfehlung:** speichere die **File-ID** als Script Property, damit GAS nicht jedes Mal suchen muss.

1) Einmalig File-ID finden (Ordner `AlphaOS-Vault` → `.alphaos` → `task_export.json`) und speichern:

```js
function aos_findTaskExportFileId_once_() {
  const root = DriveApp.getFoldersByName("AlphaOS-Vault").next();
  const alphaos = root.getFoldersByName(".alphaos").next();
  const file = alphaos.getFilesByName("task_export.json").next();
  const id = file.getId();
  PropertiesService.getScriptProperties().setProperty("AOS_TASK_EXPORT_FILE_ID", id);
  return id;
}
```

2) Snapshot laden:

```js
function aos_loadTaskExport_() {
  const id = PropertiesService.getScriptProperties().getProperty("AOS_TASK_EXPORT_FILE_ID");
  const text = DriveApp.getFileById(id).getBlob().getDataAsString("UTF-8");
  const tasks = JSON.parse(text);
  return Array.isArray(tasks) ? tasks : [];
}
```

**Datumsfelder aus Taskwarrior** sind oft im Format `YYYYMMDDTHHMMSSZ` (z.B. `20260104T102030Z`). Helper:

```js
function aos_twDate_(value) {
  if (!value) return null;
  const s = String(value);
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  return m ? new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`) : new Date(s);
}
```

Hinweis: falls der Drive-Ordner `.alphaos` bei dir anders heißt (z.B. ohne Punkt), passe den Namen im Finder an oder arbeite nur mit `AOS_TASK_EXPORT_FILE_ID`.

## Nützliche Queries (als Beispiele)

- Door Hot List: `task project:HotList +potential list`
- Alle Door-Tasks einer Domain: `task +door +business list`
- Aktive War Stack Tasks: `task +warstack list`
- Fire heute (Tag-basiert): `task +fire +hit +production due:today list` (wenn du `due` nutzt)
- Core4 heute (Tag-basiert): `task +core4 due:today list`
