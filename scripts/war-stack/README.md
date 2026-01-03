# War Stack Automation Scripts

**Status:** ✅ ACTIVE (CLI alternative to GAS/Index Node)

## war_stack_create.sh

**Purpose:** Fully automated War Stack → Taskwarrior + TickTick creation (CLI)

**Usage:**
```bash
war_stack_create.sh ~/AlphaOS-Vault/Door/2-Plan/WS_Vitaltrainer_KW01.md
```

**What it does:**
1. **Parse War Stack markdown**
   - Extract domain, title, week
   - Extract Domino Door section
   - Validate Domino Door (check if other doors listed)
   - Extract 4 Hits (FACT/OBSTACLE/STRIKE/RESPONSIBILITY)

2. **Create Taskwarrior tasks**
   - Door parent task (tags: `+door +plan`, project: title, UDA: `door_uuid`)
   - 4 Hit child tasks (tags: `+hit +production`, `depends:` on Door)
   - Due dates: Monday-Thursday (Hit 1-4)
   - Annotate with `file://` links to markdown

3. **Create TickTick project** (optional)
   - Project name: `WS_<Title>_KW<Week>`
   - 4 Hit tasks in project
   - Priority: 5 (high)
   - Tags: `production,<domain>`

4. **UUID Mapping**
   - Store Door UUID → TickTick Project ID mapping
   - Sync UUID to TickTick description (via `door_uuid_sync.py`)
   - Enables bidirectional sync

**Dependencies:**
- `task` (Taskwarrior)
- `jq`, `yq` (JSON/YAML parsing)
- `ticktick_api.sh` (optional, for TickTick integration)
- `door_uuid_sync.py` (optional, for UUID sync)

**Configuration:**
```bash
export VAULT_PATH="$HOME/Dokumente/AlphaOs-Vault"
export TICKTICK_API="$HOME/.dotfiles/scripts/utils/integrations/ticktick_api.sh"
export SKIP_DOMINO_VALIDATION=1  # Skip Domino Door check
```

**Comparison with other implementations:**

| Implementation | Use Case | Status |
|----------------|----------|--------|
| **war_stack_create.sh** | CLI automation, batch processing | ✅ Active |
| **GAS door.gs** | Cloud-based (laptop offline), mobile web UI | ✅ Active |
| **Index Node** | Local web UI, API server | 🚧 In Progress |
| **Python War Stack Bot** | Telegram conversational flow | ✅ Active |

**When to use this script:**
- Batch processing multiple War Stacks
- CLI/terminal workflow preference
- Automation via cron/systemd
- Offline operation (no Bridge/GAS dependency)

**When to use alternatives:**
- **GAS:** Mobile access, laptop offline
- **Index Node:** Web UI, integrated with Door Centre
- **Telegram Bot:** Interactive guided flow, mobile messaging

**Output:**
```
=== War Stack Automation Started ===
File: /path/to/war_stack.md
  Title: Vitaltrainer Module 6
  Domain: business
  Week: KW01
  Domino Door: Complete Module 6 certification
  ✅ Domino Door validated (3 doors will open)
Extracting 4 Hits...
  Hit 1: Study anatomy chapters 1-3
  Hit 2: Practice teaching demo
  Hit 3: Write reflection essay
  Hit 4: Submit final assessment
Creating TickTick list...
  List name: WS_Vitaltrainer_Module_6_KW01
  ✅ Created TickTick project: 63f8e7c9a1b2
  ✅ Added Hit 1: 63f8e7ca
  ✅ Added Hit 2: 63f8e7cb
  ✅ Added Hit 3: 63f8e7cc
  ✅ Added Hit 4: 63f8e7cd
Creating Taskwarrior tasks...
  ✅ Created Door task: ID=42 UUID=a1b2c3d4-...
  ✅ Annotated with: /path/to/war_stack.md
  ✅ Created Hit 1 task: 43 (due: 2026-01-06)
  ✅ Created Hit 2 task: 44 (due: 2026-01-07)
  ✅ Created Hit 3 task: 45 (due: 2026-01-08)
  ✅ Created Hit 4 task: 46 (due: 2026-01-09)
  ✅ UUID Mapping: a1b2c3d4-... → 63f8e7c9a1b2
  ✅ UUID synced to TickTick
=== War Stack Automation Complete ===

Next steps:
1. TickTick will sync to: ~/AlphaOS-Vault/Door/3-Production/
2. taskopen <uuid> to open files
3. Complete Hits Mon-Thu (4 days)
4. Sunday: General's Tent review

Elliott teaches: 'The map is not the territory. Execute your Hits!'
```

**Known Issues:**
- TickTick API token required (`~/.ticktick_token` or `$TICKTICK_TOKEN`)
- Assumes War Stack markdown follows specific format
- Week calculation may differ from ISO week

**Future Enhancements:**
- [ ] Integrate with Index Node `/api/door/export` endpoint
- [ ] Support for custom due dates (not just Mon-Thu)
- [ ] Profit task creation (wait:+5d after Door completion)
- [ ] Hit task dependencies (Hit 2 depends on Hit 1, etc)

---

**Related:**
- `gas/door.gs` - GAS implementation (similar logic)
- `python-warstack-bot/` - Telegram bot implementation
- `DOOR_CENTRE.md` - Door Centre architecture
- `scripts/ticktick/` - TickTick integration tools
