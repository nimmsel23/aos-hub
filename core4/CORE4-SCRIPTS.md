# CORE4 Scripts (Wartungsreferenz)

> Wichtig / pflegepflichtig:
> Dieses Dokument ist die zentrale Uebersicht fuer die `core4`-Skripte.
> Bei Aenderungen an CLI-Kommandos, Routing, Dateipfaden, Env-Variablen oder Timern muss dieses Dokument mit aktualisiert werden.

## Zweck

Dieses Dokument erklaert, welche Skripte im Core4-Bereich existieren, wofuer sie zustaendig sind und wie sie zusammenhaengen.
Es ist kein Nutzer-Quickstart, sondern eine Maintainer-Referenz.

## Wo die Logik lebt

- `core4/core4ctl` gibt es hier nicht als Monolith.
- Der zentrale Einstieg ist `core4/python-core4/core4ctl` (duenner Dispatcher).
- Die eigentliche Funktionalitaet ist aufgeteilt in `core4/python-core4/core4-*-ctl` Helfer und Python-Module (`tracker.py`, `core4_*.py`).

## Script-Landkarte (wichtigste Dateien)

### 1) Top-Level Dispatcher (Operations-Frontdoor)

- `core4/python-core4/core4ctl`
  - Duenner Router fuer die Core4-Betriebsbefehle.
  - Leitet an spezialisierte Helfer weiter:
    - `core4-trackctl`
    - `core4-syncctl`
    - `core4-apictl`
    - `core4-servicectl`
    - `core4-clinctl`
    - `core4-menuctl`
  - Besonderheit:
    - ohne Argument + im TTY startet es `menu`
    - ohne TTY zeigt es `help`

### 2) Modulare `*ctl` Helfer (die eigentliche Betriebslogik)

- `core4/python-core4/core4-trackctl`
  - Tracker-nahe Befehle (`status`, `sources`, `build`)
  - Ledger/Derived Maintenance (`seed-week`, `export-daily`, `prune-events`, `finalize-week`, `finalize-month`)
  - Habit-Konfig-Editor (`edit-habit`)
  - Taskwarrior-Wrapper (`list`, `today`, `week`, `done`)

- `core4/python-core4/core4-syncctl`
  - `sync` workflows now delegate to `vaultctl core4`
  - `push-core4`: explicit ledger push (fallback when vaultctl is unavailable)
  - `pull-core4`: zieht Ledger von Drive (HQ + optional Standalone) und baut lokal Derived Artefakte neu

- `core4/python-core4/core4-apictl`
  - Probe/Healthchecks gegen Bridge + Index Node
  - `all`, `today`, `week [YYYY-Www]`
  - Nutzt `curl`, konfigurierbar ueber Env-Variablen

- `core4/python-core4/core4-servicectl`
  - User-systemd Mount-Steuerung (`mount-*`)
  - Installation der Core4-Timer-Unit-Dateien (`install-timers`)

- `core4/python-core4/core4-clinctl`
  - CLI-Install/Diagnose fuer das `core4` Binary
  - `doctor`, `install-cli [TARGET]`

- `core4/python-core4/core4-menuctl`
  - Interaktives Operations-Menue (Status, Pull/Push, Sync, Timer, Mount, Doctor)
  - Nutzt die anderen `*ctl` Skripte, keine eigene Fachlogik

### 3) Gemeinsame Shell-Infrastruktur (kritisch)

- `core4/python-core4/core4-lib.sh`
  - Shared Helpers fuer alle `core4-*-ctl` Skripte
  - Laedt Umgebungsdateien (`~/.env/aos.env`, `~/.env/core4.env`)
  - Berechnet Standardpfade/Remotes
  - Liefert Hilfen fuer:
    - Tracker/Seeder-Checks
    - `rclone copy` Wrapper
    - `vaultctl` Aufloesung
    - optionale Telegram-Signale

Hinweis:
- Wenn sich Pfade, Default-Remotes oder Env-Variablen aendern, ist `core4-lib.sh` fast immer mitbetroffen.

### 4) Python-Kernlogik (Produktlogik)

- `core4/python-core4/tracker.py`
  - Kanonische Core4-CLI fuer Habit-Logging und Auswertung
  - Arbeitet auf append-only Event-Ledger (`.core4/events/...`)
  - Baut/liest Day-/Week-Artefakte
  - Integriert Taskwarrior/TickTick/Bridge-Pfade (direkt oder indirekt)

- `core4/python-core4/core4_*.py`
  - Aufgeteilte Fachlogik (Typen, Pfade, Ledger, UI, Export, Scoring, Journal, Taskwarrior, etc.)
  - Diese Module sollten bevorzugt erweitert werden statt neue Monolith-Skripte zu bauen

- `core4/python-core4/seed_week.py`
  - Standalone Seeder fuer Wochen-Tasks (Taskwarrior)
  - Wird u. a. aus `core4-trackctl` verwendet (inkl. Dry-Run-Preview beim Habit-Edit)

### 5) Weitere User-/Ops-Skripte (wichtig, aber andere Rolle)

- `core4/python-core4/core4-dashboard`
  - Das `core4` Dashboard-Skript (Live-Ansicht, Hotkeys, Auto-Refresh)
  - Mit Argumenten: Pass-through zu `tracker.py`
  - Ohne Argumente: Dashboard-UI

- `core4/python-core4/c4`
  - Schneller Ledger-/Derived-Reader fuer Tagesstatus (kein Bridge-Zwang)
  - Nimmt optional ein Datum (`YYYY-MM-DD`)

- `core4/python-core4/core4-month-close`
  - Kleiner Wrapper fuer Monatsabschluss des Vormonats
  - Typisch fuer Timer/Automation

- `core4/python-core4/core4-migratectl`
  - Migrationswerkzeug (z. B. Alpha_Core4 -> Alpha_HQ)
  - Dry-run standardmaessig, `--apply` fuehrt wirklich aus
  - Nicht Teil des taeglichen Flows, aber wichtig fuer Datenmigrationen

## `core4ctl` Routing (was wohin delegiert)

- `core4ctl` ist absichtlich klein. Das Mapping ist die zentrale Architekturentscheidung:

- `menu` -> `core4-menuctl`
- `doctor`, `install-cli` -> `core4-clinctl`
- Tracker-/Taskwarrior-Befehle -> `core4-trackctl`
- Sync-Befehle (`sync`, `pull-core4`, `push-core4`) -> `core4-syncctl`
- `probe` -> `core4-apictl`
- Mount-/Timer-Befehle -> `core4-servicectl`

Wichtig:
- Es existieren Routing-Aliase, die nicht alle im Help-Text auftauchen (z. B. `pull`, `push`, `prune`, `seal-week`, `seal-month`, `ls`, `completed`, `edit`).
- Bei Refactors immer Routing + Usage-Text synchron halten.

## Datenmodell / Betriebsannahmen (fuer Skript-Aenderungen relevant)

- Source of truth:
  - append-only Ledger unter `.core4/events/**`
- Derived Artefakte:
  - `core4_day_*.json`
  - `core4_week_*.json`
  - Exporte/CSV/Week Summaries
- Sync-Policy:
  - `core4-syncctl` pusht/pullt bewusst nur `.core4/**`
  - Derived Dateien werden lokal neu gebaut

Das ist wichtig, weil "einfach alles syncen" zu Duplikaten/Inkonsistenzen fuehren kann.

## Tent-Integration (woechentliche Buentelung / Seal)

Fuer den General's Tent sollte Core4 zusaetzlich einen expliziten Wochen-Export bereitstellen, damit Tent nicht nur JSON konsumiert, sondern eine stabile, archivfaehige Wochenzusammenfassung bekommt.

Empfohlene Artefakte (kanonisch fuer den Tent-Workflow):

- `weekly_core4score.csv`
  - Wochenbezogener Core4-Score-Export (fuer Tent-Auswertung / Nachvollziehbarkeit)
  - Soll die fuer Tent relevanten Wochenkennzahlen in CSV-Form bereitstellen
  - Sinnvoller Trigger: im Tent-Wochenabschluss bzw. direkt vor dem finalen Tent-Bundle
  - Aktuelle Repo-Empfehlung: Export-Orchestrierung im Tent-Centre (Route/Service) halten statt neue Sonderlogik in `index-node/server.js` zu streuen

- `generalstent_YYYY-KW**.md`
  - Finale, gebuendelte und "versiegelte" Wochenakte fuer den General's Tent
  - Soll Core4-Wochenscore + Tent-Synthese + weitere Wochenkomponenten zusammenfassen
  - Aktuelle Repo-Empfehlung: Bundle/Seal-Logik bei `index-node/routes/game.tent.js` / `index-node/services/tent.service.js`

Wichtig zur Einordnung (Ist-Stand):

- Aktuell existieren bereits Tent-Markdown-Saves mit Namen
  - `generals_tent_YYYY-Www.md` (via `/api/generals/report`)
  - `tent_YYYY-Www.md` (via `/api/tent/save-weekly`)
- Im lokalen Tent-Prototyp wird aktuell `generalstent_YYYY-KW**.md` verwendet.
- Fuer Index-Node/Tent-Centre sollte dieselbe Namenslinie uebernommen oder bewusst anders dokumentiert werden.
- Bestehende `server.js`-Endpoints sind Ist-Stand/Legacy; neue Tent-Bundle-Exports vorzugsweise in den Tent-Modulen aufbauen.

Offen (Stand 2026-02-27):

- Archiv-/Speicherlogik fuer Core4-Derived JSON/CSV ist noch nicht final standardisiert (Retention, Prune, eindeutige Read-Priority).
- Tent-History (`_history`) hat aktuell keine feste Retention-Policy.
- Namenslinien zwischen lokalem Tent-Prototyp und Index-Node-Endpunkten sind noch parallel und muessen final harmonisiert oder bewusst getrennt dokumentiert werden.
- Traceability der Tent-Bundles (genauer Core4-Input inkl. Fallback-Modus) sollte noch erweitert werden.

## Externe Abhaengigkeiten nach Bereich

- Allgemein:
  - `bash`, `python3`
- Tracker / Daily Work:
  - `task` (Taskwarrior)
  - optional `fzf`
  - optional `jq` (z. B. `c4`, Dashboard)
- Sync:
  - `rclone`
  - `vaultctl` (repo-lokal bevorzugt aufgeloest)
- Probe:
  - `curl`
- Systemd:
  - `systemctl`, `journalctl`
- Optional Komfort:
  - `notify-send`
  - `tele`

## Pflege-Regeln (wenn du etwas aenderst)

### Wenn du einen `core4ctl` Befehl hinzufuegst/entfernst/umbenennst

Aktualisiere mindestens:

- `core4/python-core4/core4ctl` (Routing + `usage()`)
- das zustaendige `core4/python-core4/core4-*-ctl` (Routing + `usage()`)
- `core4/CORE4-SCRIPTS.md` (dieses Dokument)
- `core4/CHEATSHEET.md` (wenn Nutzer-Workflow betroffen)
- `core4/README.md` (wenn Quickstart/empfohlene Befehle betroffen)

### Wenn du Pfade/Env-Defaults/Remotes aenderst

Aktualisiere mindestens:

- `core4/python-core4/core4-lib.sh`
- `core4/CORE4-SCRIPTS.md` (Abschnitte "Gemeinsame Shell-Infrastruktur" / "Datenmodell")
- ggf. `core4/python-core4/README.md` (Storage-/Sync-Hinweise)

### Wenn du Timer/Systemd-Units aenderst

Aktualisiere mindestens:

- `core4/python-core4/core4-servicectl`
- `aos-hub/systemd/core4-*.service` / `*.timer`
- `core4/CORE4-SCRIPTS.md`

### Wenn du Migrations-/Einmal-Skripte aenderst

- Kennzeichne im Changelog, ob es safe/dry-run ist oder schreibend arbeitet
- Halte Beispiele aktuell (`core4-migratectl` Usage)
- Dokumentiere Ziel-/Quellpfade klar

### Wenn du Core4 <-> Tent Wochenexporte einbaust/aenderst

- Dateinamen und Wochenformat festziehen (`YYYY-Www` vs `YYYY-KW**`) und dokumentieren
- Produzent festlegen (im aktuellen Layout vorzugsweise Tent-Centre Route/Service)
- `core4/CORE4-SCRIPTS.md` und Tent-Doku gemeinsam aktualisieren
- Bestehende Tent-Dateinamen (`generals_tent_*`, `tent_*`) nicht stillschweigend brechen

## Minimaler Smoke-Test nach Skript-Refactor

```bash
cd ~/aos-hub/core4/python-core4
./core4ctl help
./core4ctl doctor
./core4ctl status
./core4ctl probe today
./core4-syncctl --help
./core4-trackctl --help
```

Optional (wenn Umgebung vorhanden):

```bash
./core4-servicectl mount-status
./core4-migratectl status
./c4
```

## Grenzen dieses Dokuments

- Dieses Dokument beschreibt Zustaendigkeiten und Wartungspunkte.
- Es ersetzt nicht:
  - `core4/ARCHITECTURE.md` (grober Systemaufbau)
  - `core4/CHEATSHEET.md` (Nutzerbefehle)
  - `core4/python-core4/README.md` (CLI-/Storage-Hintergrund)
