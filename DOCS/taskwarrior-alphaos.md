# Taskwarrior in AlphaOS (AOS)

**Config:** `~/.taskrc` | **Data:** `~/.task/` | **Version:** 3.4.x
**Last Updated:** 2026-02-10

---

## Grundsaetze

- **Taskwarrior ist der lokale Ursprung** fuer Tasks (UUID-first).
- **Priority (H/M/L) ist das zentrale Steuerungselement.**
- **Centres sind Tags**, nicht Projects.
- **Domains sind Tags** (body/being/balance/business), damit Queries und Sync-Trigger eindeutig sind.
- **TickTick Sync** nutzt Tags als Trigger/Identifier (mobile Oberflaeche), ohne die lokale Wahrheit zu ersetzen.

---

## Priority System (H / M / L)

| Priority | Coefficient | Bedeutung | Wann setzen |
|----------|-------------|-----------|-------------|
| **H** | 12.0 | MUSS diese Woche | War Stack Hits, Deadlines, Domino Doors |
| **M** | 6.0 | SOLL diese Woche | Focus Tasks, Active Doors, geplante Arbeit |
| **L** | 1.0 | KANN irgendwann | Backlog, Someday/Maybe |
| *(leer)* | 0.0 | Nicht priorisiert | Neue Tasks ohne Einordnung |

**Farben:** H = weiss auf rot, M = gelb, L = grau

**Urgency-Hierarchie:**
```
Priority H (12) > Due-Date (10) > +next (8) > Blocking (6)
> Active (4) > Scheduled (4) > +warstack (4) > +door (3)
> Domain-Projekt (2) > +bigrock (2) > Age/Project/Tags (~1)
```

---

## Naming Conventions (Case)

| Feld | Case | Beispiel |
|------|------|----------|
| `project:` | UPPERCASE | `project:BODY.Fire` |
| `domain:` (UDA) | lowercase | `domain:body` |
| `pillar:` (UDA) | lowercase | `pillar:game` |
| `alphatype:` (UDA) | lowercase | `alphatype:hit` |
| `priority:` | UPPERCASE | `priority:H` |
| Tags | lowercase | `+fire`, `+warstack` |

---

## UDAs (User Defined Attributes)

| UDA | Type | Values | Zweck |
|-----|------|--------|-------|
| `pillar` | string | code, core, voice, door, game | AlphaOS 5 Pillars |
| `domain` | string | body, being, balance, business | Core Four Domains |
| `alphatype` | string | daily, door, strike, hit, big, little, sand, focus, freedom, frame, ipw, voice, map, warstack | Task-Typ |
| `points` | numeric | (default: 0) | Core4 28-or-Die |
| `door_name` | string | (frei) | Door-Name |
| `hit_number` | numeric | 1, 2, 3, 4 | War Stack Hit# |

---

## Project vs Tags

- **Door** als eigenes `project:"<DoorName>"` (z.B. `project:Vitaltrainer-Ausbildung`), plus Tags: `+door +plan +business` usw.
- **Fire Hits** als `project:DOMAIN.Fire` (z.B. `project:BODY.Fire`), Tags: `+fire +hit`
- **Core4**: `alphatype:daily` + Domain-Tag. Project optional.
- **HotList**: `project:HotList +hot +potential`

---

## Custom Reports

| Report | Command | Zeigt |
|--------|---------|-------|
| **next** | `task next` | Standard-Ansicht, sortiert nach urgency |
| **core** | `task core` | Daily Core4 Tasks (alphatype:daily) |
| **fired** | `task fired` | Fire Daily - heute faellig / ueberfaellig |
| **firew** | `task firew` | Fire Weekly - aktuelle Woche (Mo-So) |
| **door** | `task door` | Active Doors mit Hit Lists |
| **hit** | `task hit` | Weekly Hit List (4 Hits per Door) |
| **war** | `task war` | Completed Hits diese Woche |
| **hot** | `task hot` | Hot List (War Stack candidates) |
| **hotlist** | `task hotlist` | Hot List (Potential Phase) |
| **voice-strikes** | `task voice-strikes` | Tasks aus VOICE Sessions |
| **focus** | `task focus` | Monthly Focus Mission |
| **freedom** | `task freedom` | Annual Freedom Map |
| **28** | `task 28` | Weekly 28-or-Die Score |
| **bigrock** | `task bigrock` | Big Rocks overview |
| **cw** | `task cw` | ClaudeWarrior managed Tasks |

---

## Hooks

Alle Hooks in `~/.task/hooks/`.

| Hook | Sprache | Funktion |
|------|---------|----------|
| `on-add.99-alphaos.py` | Python | Telegram-Notification via tele / GAS Bridge |
| `on-add.core4` | Python | Core4-Tasks an TickTick synchen |
| `on-add.hotlist-ticktick` | Bash | HotList-Tasks an TickTick |
| `on-add.task-sync` | Bash | Local sync map updaten |
| `on-modify.99-alphaos.py` | Python | Modify-Events an Telegram/GAS |
| `on-modify.core4` | Python | Core4 Modify-Events |
| `on-modify.task-sync` | Python | Sync map bei Modify |
| `on-modify` | Python | TickTick completion sync |
| `on-exit.99-alphaos.py` | Python | task_export.json aktualisieren |

**WICHTIG: Umlaute in Hooks**

Alle Python-Hooks die JSON an stdout schreiben MUESSEN `json.dumps(..., ensure_ascii=False)` verwenden.
Ohne `ensure_ascii=False` werden Umlaute zu `u00e4` (statt ae) escaped und so in Taskwarrior gespeichert.

---

## Fire Map Integration

### Task-Erstellung

```bash
~/.dotfiles/scripts/utils/fire-to-tasks.sh <FIRE_MAP_FILE> [--dry-run]
```

Erstellt pro Hit:
```
project:DOMAIN.Fire  +fire +hit  due:SONNTAG_DER_KW
pillar:game  domain:domain_lowercase  alphatype:hit  priority:H
hit_number:N  +domain_tag
```

### War Stack -> Fire Map

```bash
~/.dotfiles/scripts/utils/warstack-to-firemap.sh <WAR_STACK_FILE> [KW] [YEAR]
```

Generiert Fire Map Markdown, delegiert Taskwarrior-Sync an `fire-to-tasks.sh`.

### Bot-Snapshots (firemap.py)

Der firemap-Bot (`~/aos-hub/python-firemap/`) filtert nach Tags (`+fire`, `+hit`, `+production`), nicht nach UDAs.
Config via `~/.env/fire.env` oder `AOS_FIREMAP_*` Umgebungsvariablen.

### Systemd-Timer

| Timer | Wann | Was |
|-------|------|-----|
| `alphaos-fire-daily.timer` | taeglich | Fire-Snapshot an Telegram |
| `alphaos-fire-weekly.timer` | Montag 08:05 | Wochen-Snapshot an Telegram |
| `alphaos-firemap-weekly.timer` | woechentlich | Fire Map nach Taskwarrior synchen |

---

## Task Export Snapshot

Fuer Bots/UIs (schnell lesbar, kein `task export` pro Request):

- **Default:** `~/.local/share/alphaos/task_export.json`
- **Vault-Copy:** `~/AlphaOS-Vault/.alphaos/task_export.json` (optional, fuer GAS via Drive)
- **Aktualisiert durch:** `on-exit.99-alphaos.py` Hook (nach jeder Task-Aktion)

### GAS: Snapshot aus Drive lesen

```js
function aos_loadTaskExport_() {
  const id = PropertiesService.getScriptProperties().getProperty("AOS_TASK_EXPORT_FILE_ID");
  const text = DriveApp.getFileById(id).getBlob().getDataAsString("UTF-8");
  return JSON.parse(text);
}

// Taskwarrior Datumsformat: YYYYMMDDTHHMMSSZ
function aos_twDate_(value) {
  if (!value) return null;
  const s = String(value);
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  return m ? new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`) : new Date(s);
}
```

---

## Haeufige Workflows

### Fire Map Woche starten

```bash
# 1. War Stack -> Fire Map
warstack-to-firemap.sh ~/AlphaOs-Vault/DOOR/War-Stacks/WAR_STACK_X.md

# 2. Fire Map -> Taskwarrior
fire-to-tasks.sh ~/AlphaOs-Vault/GAME/Fire/FIRE_MAP_BODY_KWxx_2026.md

# 3. Pruefen
task fired    # heute
task firew    # ganze Woche
```

### Task mit richtigen UDAs anlegen

```bash
# Fire Hit
task add "Sprint Review" project:BUSINESS.Fire +fire +hit \
  domain:business pillar:game alphatype:hit priority:H hit_number:1 due:sunday

# Door Task
task add "FADARO Landing Page" project:BUSINESS +door \
  domain:business alphatype:door priority:M due:2026-03-01

# Core4 Daily
task add "Core4 BODY Training" domain:body alphatype:daily +core4

# Hot List Eintrag
task add "Podcast starten" project:HotList +hot +potential priority:L
```

### Nuetzliche Queries

```bash
task +fire +hit status:pending list          # Alle Fire Hits
task project:HotList +potential list          # Hot List
task +door +business list                    # Business Doors
task +warstack list                          # War Stack Tasks
task priority:H status:pending list          # Alles mit Priority H
task domain:body status:pending list         # Alles fuer BODY
```

---

## Contexts

| Context | Filter | Aktivieren |
|---------|--------|------------|
| `hot` | `+hot` | `task context hot` |

---

## Known Issues & Fixes

### 2026-02-10: Umlaute als u00xx gespeichert

**Ursache:** `on-add.core4` und `on-modify` (TickTick) nutzten `json.dumps()` ohne `ensure_ascii=False`.
**Fix:** `ensure_ascii=False` in beiden Hooks. 10 betroffene Tasks manuell repariert.

### 2026-02-10: Priority H/M/L hatte keinen Effekt

**Ursache:** Default-Coefficients (H=6.0) wurden von Tag-Boosts (warstack=15, door=12) ueberstimmt.
**Fix:** .taskrc komplett neu gebaut. Priority-Coefficients erhoeht (H=12, M=6, L=1), Tag-Boosts reduziert.

### 2026-02-10: fire-to-tasks.sh setzte keine Priority

**Ursache:** Script hatte kein `priority:` Feld im `task add`.
**Fix:** `priority:H`, `hit_number:$HIT_COUNTER`, `pillar:game` (lowercase) hinzugefuegt.

### 2026-02-10: Doppelte Report-Definitionen in .taskrc

**Ursache:** `fired` und `firew` waren je 2x definiert (letzte ueberschrieb erste still).
**Fix:** .taskrc komplett neu gebaut, keine Duplikate.
