# Taskwarrior ↔ TickTick Sync - Konzept & Integration

**Status:** 🚧 Konzeptphase
**Datum:** 2026-01-02
**Ziel:** Zentraler Sync-Service für alle αOS Taskwarrior tasks → TickTick

---

## Vision

**Taskwarrior = Single Source of Truth**
- Alle αOS tasks leben in Taskwarrior (mit UUIDs)
- TickTick = Mobile/Cloud interface für Taskwarrior
- Bidirektionaler Sync über intelligenten Sync-Service
- Zentrale Verwaltung über `hubctl`

---

## Komponenten-Struktur

### Empfohlene Verzeichnisstruktur

```
~/aos-hub/
├── taskwarrior-ticktick-sync/    # Zentraler TW ↔ TT Sync Service
│   ├── sync.py                    # Haupt-Sync-Logic (aktuell: ticktick_sync.py)
│   ├── hooks/                     # Taskwarrior hooks
│   │   ├── on-add.ticktick        # Auto-create in TickTick
│   │   ├── on-modify.ticktick     # Sync changes
│   │   └── on-done.ticktick       # Mark done in TickTick
│   ├── mappers/                   # Tag → Project mapping rules
│   │   ├── core4.yaml
│   │   ├── door.yaml
│   │   ├── game.yaml
│   │   └── voice.yaml
│   ├── config.yaml                # Service config
│   ├── requirements.txt
│   ├── README.md
│   └── .env.example
│
├── war-stack-automation/          # War Stack CLI tools
│   ├── war_stack_create.sh
│   ├── door_uuid_sync.py
│   └── README.md
│
└── hubctl                         # Master control script
```

**Alternative (kürzer):**
```
~/aos-hub/
├── tw-ticktick/
├── war-stack/
└── hubctl
```

---

## Sync Service Details

### 1. Core Functionality

**Bidirektionaler Sync:**
```
Taskwarrior (UUID-first)
    ↕
Sync Service (mapping + intelligence)
    ↕
TickTick (mobile/cloud)
```

**Unterstützte Task-Typen:**

| αOS Bereich | Taskwarrior Tags | TickTick Project | Status |
|-----------------|------------------|------------------|--------|
| **Core4** | `+core4 +<subtask>` | `Core4` | ✅ Implementiert |
| **Hot List** | `+potential +<domain>` | `HotList` | 🚧 Geplant |
| **Door** | `+plan +<domain>` | `Door.<Domain>` | 🚧 Geplant |
| **Hits** | `+hit +production +<domain>` | `Door.<Domain>` | 🚧 Geplant |
| **Profit** | `+profit +<domain>` | `Door.<Domain>` | 🚧 Geplant |
| **Game** | `+frame/+freedom/+focus/+fire` | `Game` | 🚧 Geplant |
| **Voice** | `+voice +<domain>` | `Voice` | 🚧 Geplant |

### 2. Mapping Configuration

**Beispiel: `mappers/door.yaml`**
```yaml
# Door Centre tasks → TickTick mapping
name: door
description: "Door Centre 4P Flow tasks"

rules:
  # Hot List (POTENTIAL)
  - taskwarrior:
      tags: ["+potential"]
      project_pattern: "HotList"
    ticktick:
      project: "HotList"
      tags: ["potential", "alphaos"]
      priority: 3

  # Door (PLAN)
  - taskwarrior:
      tags: ["+plan"]
      project_pattern: "^(Business|Body|Being|Balance)$"
    ticktick:
      project: "Door.{domain}"  # Door.Business, Door.Body, etc
      tags: ["plan", "door"]
      priority: 4

  # Hits (PRODUCTION)
  - taskwarrior:
      tags: ["+hit", "+production"]
    ticktick:
      project: "Door.{domain}"
      tags: ["hit", "production"]
      priority: 5
      subtask_of: "{door_uuid}"  # Link to parent Door task

  # Profit (PROFIT)
  - taskwarrior:
      tags: ["+profit"]
    ticktick:
      project: "Door.{domain}"
      tags: ["profit"]
      priority: 2
      wait_for: "{door_uuid}"  # Wait until Door complete
```

**Beispiel: `mappers/core4.yaml`**
```yaml
name: core4
description: "Core4 daily tasks"

subtasks:
  - fitness      # BODY - Training
  - fuel         # BODY - Nutrition
  - meditation   # BEING - Practice
  - memoirs      # BEING - Journaling
  - partner      # BALANCE - Relationship
  - posterity    # BALANCE - Legacy
  - discover     # BUSINESS - Learn
  - declare      # BUSINESS - Teach

rules:
  - taskwarrior:
      tags: ["+core4"]
      project: "core4"
    ticktick:
      project: "Core4"
      tags: ["core4", "{subtask}"]
      priority: 5

gemini:
  enabled: true
  model: "gemini-2.5-flash"
  classify_missing_subtasks: true
```

### 3. Service Config

**`config.yaml`**
```yaml
# Taskwarrior ↔ TickTick Sync Service Configuration

service:
  name: "taskwarrior-ticktick-sync"
  version: "2.0.0"
  log_level: "INFO"
  log_path: "~/.local/share/alphaos/logs/tw-ticktick-sync.log"

taskwarrior:
  bin: "task"
  hooks_enabled: true
  hooks_path: "~/.task/hooks"

ticktick:
  token_source: "env"  # env, file, keyring
  token_env: "TICKTICK_TOKEN"
  token_file: "~/.ticktick_token"
  default_project: "inbox"

sync:
  mode: "bidirectional"  # bidirectional, tw-to-tt, tt-to-tw
  interval: "5m"  # For daemon mode
  on_conflict: "taskwarrior_wins"  # taskwarrior_wins, ticktick_wins, ask

uuid_mapping:
  storage: "~/AlphaOS-Vault/.alphaos/tw_ticktick_map.json"
  legacy_symlink: "~/.local/share/alphaos/tw_ticktick_map.json"

gemini:
  enabled: true
  api_key_env: "GEMINI_API_KEY"
  model: "gemini-2.5-flash"
  cache_classifications: true
  cache_ttl: "30d"

notifications:
  telegram:
    enabled: true
    bin: "tele"
    daily_reminder: true
    reminder_time: "20:00"

mappers:
  - core4
  - door
  # - game  # Future
  # - voice # Future
```

---

## Taskwarrior Hooks Integration

### Hook Flow

```
task add project:HotList +potential "My idea"
    ↓
Taskwarrior creates task (UUID: a1b2c3d4-...)
    ↓
on-add.ticktick hook triggers
    ↓
Reads task JSON from stdin
    ↓
Sync Service processes:
    1. Check mappers/ rules
    2. Match tags → TickTick project
    3. Create TickTick task via API
    4. Save UUID mapping
    ↓
Done (non-blocking, <500ms)
```

### Hook Implementation

**`hooks/on-add.ticktick`**
```python
#!/usr/bin/env python3
import sys
import json
from pathlib import Path

# Import sync service
sys.path.insert(0, str(Path(__file__).parent.parent))
from sync import handle_task_add

# Read task JSON from stdin
task = json.load(sys.stdin)

# Process (non-blocking, fail-soft)
try:
    handle_task_add(task)
except Exception as e:
    # Log error but don't block Taskwarrior
    pass

# Always output task unchanged (Taskwarrior requirement)
print(json.dumps(task))
```

**Installation:**
```bash
cd ~/aos-hub/taskwarrior-ticktick-sync
./install-hooks.sh

# Links hooks to ~/.task/hooks/
# Makes them executable
# Tests basic functionality
```

---

## hubctl Integration

### Commands Structure

```bash
hubctl ticktick status              # Service status + last sync
hubctl ticktick sync [--force]      # Manual sync trigger
hubctl ticktick logs [--follow]     # Show logs (journalctl style)
hubctl ticktick config              # Open config in $EDITOR
hubctl ticktick map                 # Show UUID mapping stats
hubctl ticktick test                # Run connectivity tests
hubctl ticktick install-hooks       # Install Taskwarrior hooks
hubctl ticktick daemon start/stop   # Control background sync daemon
```

### hubctl Implementation Sketch

**`hubctl` (Bash)**
```bash
#!/usr/bin/env bash
# hubctl - αOS Hub Control

TICKTICK_DIR="$HOME/aos-hub/taskwarrior-ticktick-sync"
TICKTICK_LOG="$HOME/.local/share/alphaos/logs/tw-ticktick-sync.log"
TICKTICK_SERVICE="aos-ticktick-sync.service"

ticktick_status() {
    echo "=== Taskwarrior ↔ TickTick Sync Status ==="

    # Service status
    if systemctl --user is-active --quiet "$TICKTICK_SERVICE"; then
        echo "✅ Daemon: Running"
    else
        echo "⚠️  Daemon: Stopped"
    fi

    # Last sync
    if [[ -f "$TICKTICK_LOG" ]]; then
        echo ""
        echo "Last 5 operations:"
        tail -5 "$TICKTICK_LOG"
    fi

    # Mapping stats
    local map_file="$HOME/AlphaOS-Vault/.alphaos/tw_ticktick_map.json"
    if [[ -f "$map_file" ]]; then
        local count=$(jq 'length' "$map_file")
        echo ""
        echo "📊 Synced tasks: $count"
    fi
}

ticktick_logs() {
    local follow="${1:-}"
    if [[ "$follow" == "--follow" || "$follow" == "-f" ]]; then
        tail -f "$TICKTICK_LOG"
    else
        less +G "$TICKTICK_LOG"  # Open at end like journalctl
    fi
}

ticktick_config() {
    "${EDITOR:-nvim}" "$TICKTICK_DIR/config.yaml"
}

ticktick_sync() {
    cd "$TICKTICK_DIR" || exit 1
    ./sync.py --sync --status
}

ticktick_map() {
    local map_file="$HOME/AlphaOS-Vault/.alphaos/tw_ticktick_map.json"
    if [[ ! -f "$map_file" ]]; then
        echo "No mapping file found"
        exit 1
    fi

    echo "=== UUID Mapping Statistics ==="
    jq -r 'to_entries | group_by(.value.tags[0]) | .[] | "\(.[0].value.tags[0]): \(length) tasks"' "$map_file"
    echo ""
    echo "Total: $(jq 'length' "$map_file") tasks"
}

# Main dispatcher
case "${1:-}" in
    ticktick)
        case "${2:-status}" in
            status) ticktick_status ;;
            sync) ticktick_sync "${@:3}" ;;
            logs) ticktick_logs "${@:3}" ;;
            config) ticktick_config ;;
            map) ticktick_map ;;
            *) echo "Unknown ticktick command: $2" ;;
        esac
        ;;
    *)
        echo "Usage: hubctl <component> <command>"
        echo "Components: ticktick, router, bridge, index, ..."
        ;;
esac
```

### Usage Examples

```bash
# Quick status check
hubctl ticktick status
# ✅ Daemon: Running
# Last sync: 2026-01-02 20:15:23
# 📊 Synced tasks: 127

# Watch logs in real-time
hubctl ticktick logs --follow

# Manual sync
hubctl ticktick sync --force

# Check mapping
hubctl ticktick map
# core4: 42 tasks
# potential: 15 tasks
# plan: 8 tasks
# hit: 24 tasks
# Total: 89 tasks

# Edit config
hubctl ticktick config
# Opens ~/.../taskwarrior-ticktick-sync/config.yaml in $EDITOR
```

---

## Systemd Service Integration

### Service Unit

**`systemd/aos-ticktick-sync.service`**
```ini
[Unit]
Description=αOS Taskwarrior ↔ TickTick Sync Daemon
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=%h/aos-hub/taskwarrior-ticktick-sync
ExecStart=%h/aos-hub/taskwarrior-ticktick-sync/sync.py --daemon
Restart=on-failure
RestartSec=30

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=aos-ticktick-sync

# Environment
Environment="TICKTICK_TOKEN_FILE=%h/.ticktick_token"
Environment="GEMINI_API_KEY_FILE=%h/.gemini_api_key"

[Install]
WantedBy=default.target
```

### Timer (optional - for interval sync instead of daemon)

**`systemd/aos-ticktick-sync.timer`**
```ini
[Unit]
Description=αOS Taskwarrior ↔ TickTick Sync (every 5 minutes)

[Timer]
OnBootSec=1min
OnUnitActiveSec=5min
Persistent=true

[Install]
WantedBy=timers.target
```

### Journal Integration

```bash
# View logs via journalctl
journalctl --user -u aos-ticktick-sync -f

# Via hubctl (wrapper)
hubctl ticktick logs --follow

# Check status
systemctl --user status aos-ticktick-sync
```

---

## Migration Path

### Phase 1: Core4 (Current)
- ✅ ticktick_sync.py funktioniert
- ✅ Core4 8 subtasks
- ✅ Gemini classification
- ✅ UUID mapping

### Phase 2: Restructure
- [ ] Umbenennen: `ticktick_sync.py` → `taskwarrior-ticktick-sync/sync.py`
- [ ] Config aus Code extrahieren → `config.yaml`
- [ ] Mapping rules → `mappers/*.yaml`
- [ ] Taskwarrior hooks → `hooks/`

### Phase 3: Door Integration
- [ ] Door mapping rules (`mappers/door.yaml`)
- [ ] Hot List sync
- [ ] Door/Hits sync (mit parent/child dependencies)
- [ ] Profit sync

### Phase 4: hubctl Integration
- [ ] `hubctl ticktick` commands
- [ ] Systemd service
- [ ] Log viewing
- [ ] Config management

### Phase 5: Game/Voice (Future)
- [ ] Game mapping rules
- [ ] Voice mapping rules

---

## Offene Fragen

1. **Daemon vs Timer?**
   - Daemon = kontinuierlich im Hintergrund (mehr resource usage)
   - Timer = alle 5 min triggern (weniger resources, mehr delay)
   - **Empfehlung:** Timer + Hooks (Hooks = instant, Timer = backup sync)

2. **Conflict Resolution?**
   - Wenn beide Seiten geändert: Taskwarrior gewinnt? TickTick gewinnt? User fragen?
   - **Empfehlung:** Taskwarrior wins (ist source of truth)

3. **TickTick Project Struktur?**
   - Flach: `HotList`, `Door.Business`, `Door.Body`, `Core4`
   - Hierarchisch: `Door/Business`, `Door/Body` (wenn TickTick das kann)
   - **Empfehlung:** Flach (einfacher, klarer)

4. **War Stack Hits Dependencies?**
   - Taskwarrior: Door `depends:` auf Hits (blocked until done)
   - TickTick: Subtasks? Separate tasks? Dependencies gibt's nicht in TickTick
   - **Empfehlung:** Separate tasks mit naming convention: `[Door] Hit 1: ...`

---

## Vorteile dieser Architektur

✅ **Zentral** - Ein Service für alle Taskwarrior ↔ TickTick sync
✅ **Erweiterbar** - Neue Task-Types via YAML mapping rules
✅ **Transparent** - Logs über hubctl einsehbar
✅ **Fail-soft** - Hooks blockieren Taskwarrior nicht
✅ **UUID-first** - Taskwarrior bleibt source of truth
✅ **Konfigurierbar** - YAML statt hardcoded logic
✅ **Wartbar** - Klare Struktur, dokumentiert

---

## Nächste Schritte

**Jetzt:**
1. Feedback zu diesem Konzept einholen
2. Verzeichnisstruktur festlegen (taskwarrior-ticktick-sync vs tw-ticktick)
3. Migration planen (wann umbauen?)

**Dann:**
1. Config-System implementieren (config.yaml, mappers/)
2. hubctl commands bauen
3. Systemd service erstellen
4. Door integration

---

**Letzte Änderung:** 2026-01-02
**Status:** Konzept (Review pending)
