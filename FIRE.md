# FIRE System Summary (`aos-hub`)

Stand: **Dienstag, 3. März 2026** (Code + Laufzeit geprüft)

## 1) Aktuelles Zielbild (was jetzt live ist)

FIRE besteht aktuell aus vier Schichten:

1. **Task-Quelle (SSOT):** Taskwarrior
2. **APIs/UI (Node):** `index-node/routes/fire.js`, `index-node/public/game/fire.html`, `index-node/public/pwa/fire/*`
3. **Push/Automation (CLI + systemd):** `game/fire/firectl` + User-Timer
4. **Telegram/GCal Sender:** `game/fire/firemap.py`, `game/fire/firemap_bot.py`, `game/fire/gcal-push-due.sh`

Kanonischer CLI-Einstieg:
- `game/fire/firectl`  
Wrapper:
- `scripts/firectl`

## 2) Verifizierte API- und UI-Routen

API (Node, Port `8799`):
- `GET /api/fire/day`
- `GET /api/fire/week`
- `GET /api/fire/week-range`
- Alias-Redirects: `/fire/day`, `/fire/week`, `/fired`, `/firew`

UI:
- Desktop: `GET /game/fire` -> `/game/fire.html`
- PWA: `GET /pwa/fire/`

Smoke-Checks (heute):
- `http://127.0.0.1:8799/health` -> `200` (`ok: true`)
- `http://127.0.0.1:8799/api/fire/day` -> `ok: true`, `source: taskwarrior`, `count: 26`
- `http://127.0.0.1:8799/api/fire/week` -> `ok: true`, `count: 26`
- `http://127.0.0.1:8799/api/fire/week-range` -> `ok: true`, `days: 7`
- `http://127.0.0.1:8799/pwa/fire/` -> `200`
- `https://ideapad.tail7a15d6.ts.net/pwa/fire/` -> `200`

## 3) Aktive Auswahl-Logik (Ist-Zustand)

### `index-node/routes/fire.js`

- Statusfilter: nur `pending`
- Datumsfelder: `scheduled,due,wait` (konfigurierbar)
- Overdue wird inkludiert (day/week)
- Undated wird inkludiert, wenn `FIRE_INCLUDE_UNDATED=1`
- Exclude-Tags aktiv: `FIRE_TASK_EXCLUDE_TAGS` (Default `door,mission`)
- Domain ist strikt Taskwarrior-UDA (`domain`):
  - erlaubt: `body|being|balance|business`
  - ohne valide Domain: Task wird aus FIRE ausgeschlossen
- Domainfilter optional per Query `?domain=body|being|balance|business`

### GCal Due Push (`game/fire/gcal-push-due.sh`)

- Quelle aktuell: `AOS_FIRE_GCAL_TW_SOURCE=report`, `AOS_FIRE_GCAL_TW_REPORT=fired`
- Heute-Check: `due_today=0`, `overdue=7` (Doctor-Output)
- Scheduler-as-timed aktiv (`AOS_FIRE_GCAL_SCHEDULED_AS_TIMED=1`)

## 4) Systemd-Stand (User)

Kanonische Units (`aos-*`) vorhanden und aktiv:
- `aos-fire-daily.timer` -> täglich `08:00`
- `aos-fire-weekly.timer` -> Sonntag `22:00`
- `aos-fire-daily.service` führt aus:
  - `firectl send daily`
  - `firectl gcal due`

Heute verifiziert:
- Letzter Daily-Run erfolgreich: **Dienstag, 3. März 2026, 08:00 CET**

## 5) Offene Inkonsistenzen (wichtig)

1. **PWA Health Check in `firectl status` ist falsch verdrahtet**
- `firectl` prüft `.../pwa/health`, dieser Endpoint existiert nicht (`404` lokal + tailnet).
- Effekt: `firectl status` meldet PWA als down, obwohl `/pwa/fire/` erreichbar ist.
Status: **behoben** (`firectl` prüft jetzt `/pwa/fire/`).

2. **Legacy-Timer noch aktiv (Doppel-/Altpfad-Risiko)**
- `alphaos-firemap-weekly.timer` ist weiterhin aktiv (Sonntag `19:00`).
- Damit existiert neben `aos-fire-weekly.timer` ein zweiter Weekly-Flow.
Status: **behoben** (Legacy-Timer deaktiviert; aktiv bleiben `aos-fire-daily.timer` und `aos-fire-weekly.timer`).

3. **Router-Extension defaultet auf alte Unit-Namen**
- `router/extensions/firemap_commands.py` nutzt default:
  - `alphaos-fire-daily.service`
  - `alphaos-fire-weekly.service`
- Diese Services existieren noch und umgehen damit den neuen kanonischen `aos-*`-Pfad.
Status: **behoben** (Defaults auf `aos-fire-daily.service` und `aos-fire-weekly.service`).

4. **Desktop Fire Capture View ist funktional unvollständig**
- In `index-node/public/game/fire.html` werden `captureStrikes(...)` und `exportWeekToMarkdown()` aufgerufen, aber nicht definiert.
- Auch `onCaptureWeekChange()` ist referenziert, aber nicht definiert.
- Effekt: Capture/Export Buttons brechen bei Klick.

5. **PWA Fire zeigt aktuell schnell „leer“**
- Der alte `domain: "other"`-Pfad ist entfernt.
- Domain-Fallback-Zuordnung wurde entfernt (keine Auto-Zuordnung auf irgendeine Domain).

6. **API-Filtervariablen nur teilweise wirksam**
- `FIRE_TASK_EXCLUDE_TAGS` ist wirksam.
- `FIRE_TASK_TAGS` / `FIRE_TASK_TAGS_MODE` sind deklariert, aber aktuell nicht in der API-Selektion verwendet.

7. **Bot-Logik != API-Logik**
- `game/fire/firemap.py` nutzt eigene Selektion (inkl. `waiting`, eigene Tag-Logik für undated).
- Dadurch unterscheiden sich Telegram-Bot-Ausgabe und `/api/fire/*`-Datenmodell.

8. **Doku-Drift in bestehenden FIRE-Dokumenten**
- `DOCS/node/fire.md` und Teile von `DOCS/fire.md` enthalten noch veraltete Aussagen (z. B. TickTick-Fallback in `/api/fire/*`).

## 6) Relevante Konfig-Dateien

- `game/fire/fire.env` (lokale Runtime-Konfig)
- `game/fire/fire.env.example` (Template, inkl. `FIRE_TASK_EXCLUDE_TAGS=door,mission`)
- `index-node/routes/fire.js` lädt `fire.env` via `AOS_FIRE_ENV_FILE` oder Fallback `~/.env/fire.env`

## 7) Kurzfazit

Der Kernpfad (**Taskwarrior -> `/api/fire/*` -> UI + `aos-fire-daily.timer`/`aos-fire-weekly.timer`**) läuft.  
Die Hauptprobleme sind aktuell **Konsistenz und Altlasten** (Legacy-Units, Router-Defaults, PWA-Health-Check, unvollständige Capture-Funktionen, Bot/API-Drift).
