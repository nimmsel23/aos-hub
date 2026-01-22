# TickTick Scripts Analysis

**Analyzed:** 2026-01-02
**Total:** 3 scripts, 683 lines

---

## Overview Table

| Script | Lines | Status | Purpose | Dependencies |
|--------|-------|--------|---------|--------------|
| **ticktick_sync.py** | 422 | ✅ ACTIVE | Core4 bidirectional sync + Gemini matching | TickTick API, Taskwarrior, Gemini API |
| **door_uuid_sync.py** | 96 | ✅ ACTIVE | Sync Door UUIDs to TickTick descriptions | TickTick API |
| **ticktick_tag_watcher.py** | 165 | ⚠️ DEPRECATED | Tag change watcher (old automation) | TickTick API, door_lifecycle.sh |

---

## 1. ticktick_sync.py (Core4 Integration)

### Purpose
Bidirectional sync between Taskwarrior Core4 tasks and TickTick with AI-powered matching.

### Key Features

**1. Taskwarrior → TickTick (on-add hook)**
```bash
# Triggered by Taskwarrior on-add hook
task add project:core4 +core4 +fitness "Morning workout" due:today | ticktick_sync.py --stdin
```
- Creates TickTick task automatically
- Stores UUID mapping in `~/AlphaOS-Vault/.alphaos/core4_ticktick_map.json`
- Adds `TW_UUID: <uuid>` to TickTick task content

**2. TickTick → Taskwarrior (completion sync)**
```bash
# Daily sync via cron/systemd
ticktick_sync.py --sync --tele --gemini
```
- Checks completed TickTick tasks (today)
- Marks corresponding Taskwarrior tasks as done
- Uses Gemini AI for fuzzy matching when no UUID mapping exists
- Sends Telegram notification with pending tasks

**3. Gemini AI Classification**
```python
# Classifies task title into one of 8 subtasks
classify_subtask_gemini("Morning workout") → "fitness"
classify_subtask_gemini("Read book") → "meditation"
classify_subtask_gemini("Call mom") → "partner"
```

### 8 Core4 Subtasks

Mapped to AlphaOS 4 Domains:

| Subtask | Domain | Description |
|---------|--------|-------------|
| `fitness` | BODY | Training/Exercise |
| `fuel` | BODY | Nutrition/Diet |
| `meditation` | BEING | Mindfulness practice |
| `memoirs` | BEING | Journaling/Writing |
| `partner` | BALANCE | Relationship time |
| `posterity` | BALANCE | Legacy/Family |
| `discover` | BUSINESS | Learning/Research |
| `declare` | BUSINESS | Teaching/Sharing |

### Environment Variables

```bash
# Required
export TICKTICK_TOKEN="your-oauth-token"

# Optional
export CORE4_TICKTICK_PROJECT_ID="project-id"  # Default: inbox
export CORE4_TELE=1                            # Enable tele notifications
export GEMINI_API_KEY="your-gemini-key"       # For AI matching
export GEMINI_MODEL="gemini-2.5-flash"        # Default model
export CORE4_GEMINI_MATCH=1                    # Enable in --sync
export CORE4_TICKTICK_COMPLETE_ENDPOINT="..."  # Custom completion endpoint
```

### UUID Mapping Storage

**Primary:** `~/AlphaOS-Vault/.alphaos/core4_ticktick_map.json`
**Legacy:** `~/.local/share/alphaos/core4_ticktick_map.json` (symlink)

**Format:**
```json
{
  "a1b2c3d4-e5f6-7890-abcd-ef1234567890": {
    "ticktick_id": "63f8e7c9a1b2c3d4",
    "title": "Morning workout",
    "created_at": "2026-01-02T10:00:00Z"
  }
}
```

### Usage Examples

**1. Add task from Taskwarrior hook:**
```bash
task add project:core4 +core4 +fitness "Morning workout" due:today | ticktick_sync.py --stdin
```

**2. Daily sync + reminder:**
```bash
ticktick_sync.py --sync --tele --gemini
# Output: ticktick_tasks=15 updated=3 pending_today=5
# Tele: "Core4 pending today:\n- Meditation\n- Workout\n- ..."
```

**3. Push Taskwarrior completions to TickTick:**
```bash
ticktick_sync.py --push
```

**4. Status only:**
```bash
ticktick_sync.py --status
```

### Integration Flow

```
Taskwarrior on-add hook
    ↓
ticktick_sync.py --stdin
    ↓
POST /task (TickTick API)
    ↓
UUID mapping saved
    ↓
TickTick task created
    ↓
User completes in TickTick
    ↓
ticktick_sync.py --sync (cron/systemd)
    ↓
GET /task?projectId=... (TickTick API)
    ↓
Check completed today (status=2)
    ↓
Match via UUID map OR Gemini classification
    ↓
task <uuid> done
    ↓
Taskwarrior task marked complete
```

### Strengths

✅ **Bidirectional sync** - Both Taskwarrior → TickTick and TickTick → Taskwarrior
✅ **AI-powered** - Gemini handles fuzzy matching when UUID missing
✅ **Fail-soft** - Graceful degradation (works without Gemini, without TickTick)
✅ **Logging** - All operations logged to `~/.local/share/alphaos/logs/core4_ticktick.log`
✅ **Notifications** - Telegram integration for daily reminders
✅ **UUID persistence** - Vault-based mapping (survives system reinstall)

### Weaknesses

⚠️ **Manual trigger** - Requires cron/systemd for --sync (not automatic)
⚠️ **No conflict resolution** - If both sides edited, last one wins
⚠️ **Gemini cost** - API calls for each unmatched task (can get expensive)
⚠️ **Completion time window** - Only syncs tasks completed "today" (24h window)

### Recommendations

**Keep:** ✅ YES - Core4 is active, Gemini matching is unique, well-tested

**Improvements:**
1. Add `--watch` mode for continuous sync (inotify on Taskwarrior db)
2. Add conflict detection (warn if both sides changed)
3. Cache Gemini results (same title → same subtask)
4. Support for recurring tasks
5. Batch Gemini requests (reduce API calls)

---

## 2. door_uuid_sync.py (Door UUID Sync)

### Purpose
Sync Taskwarrior Door UUIDs to TickTick project descriptions (for War Stack tasks).

### Usage

```bash
door_uuid_sync.py --door-uuid a1b2c3d4-... --ticktick-id 63f8e7c9a1b2
```

### What it does

1. Fetches TickTick project details: `GET /project/{id}`
2. Appends UUID to description:
   ```
   Taskwarrior Door UUID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
   Obsidian File: obsidian://open?vault=AlphaOS-Vault&file=Door/War-Stacks/...
   ```
3. Updates project: `POST /project/{id}` with new description

### Integration

**Called by:**
- `scripts/war-stack/war_stack_create.sh` (line 371-372)
- Manual War Stack workflows

**Purpose:**
- Enables bidirectional UUID tracking between Taskwarrior and TickTick
- Links TickTick project to Obsidian vault file
- Allows taskopen-like navigation in TickTick

### Strengths

✅ **Simple** - Single focused purpose (96 lines)
✅ **Idempotent** - Checks if UUID already synced
✅ **Obsidian link** - Adds vault file link for easy navigation
✅ **Error handling** - Graceful failure with clear error messages

### Weaknesses

⚠️ **Assumes markdown file path** - Hardcoded `Door/War-Stacks/{name}.md`
⚠️ **No reverse sync** - Doesn't update Taskwarrior from TickTick
⚠️ **Project name spaces** - Uses `%20` for spaces (should use proper URL encoding)

### Recommendations

**Keep:** ✅ YES - Used by war_stack_create.sh, simple and focused

**Improvements:**
1. Make vault path configurable (env var)
2. Use `urllib.parse.quote()` for proper URL encoding
3. Add `--reverse` flag to sync UUID from TickTick → Taskwarrior annotation

---

## 3. ticktick_tag_watcher.py (DEPRECATED)

### Purpose
Watch TickTick tasks for tag changes (`#potential` → `#plan` → `#production` → `#profit`).

### Old Flow

```
Poll TickTick API every N minutes
    ↓
Check for tag changes (#potential → #plan)
    ↓
Compare with cached state (~/.local/share/alphaos/ticktick_tag_cache.json)
    ↓
If changed: Call door_lifecycle.sh
    ↓
door_lifecycle.sh moves files (1-Potential/ → 2-Plan/)
```

### Why Deprecated

❌ **Polling inefficient** - Constant API calls for changes
❌ **Tag-based state** - New system uses Taskwarrior task status as source of truth
❌ **File moving** - New system keeps files in place, tracks via UUID
❌ **Depends on door_lifecycle.sh** - Which is also deprecated

### Replaced By

**New Pattern:**
- Taskwarrior task status = state
- No file moving needed
- No polling needed
- Bridge API handles updates

### Recommendations

**Remove:** ⚠️ YES - Deprecated pattern, no longer used

**If keeping:**
- Move to `scripts/ticktick/deprecated/` with clear warning
- Keep for historical reference only

---

## Overall Assessment

### Active Scripts (Keep)

**1. ticktick_sync.py** - ✅ CRITICAL
- Core4 integration is active
- Gemini matching is unique feature
- Well-tested, production-ready
- **Action:** None needed

**2. door_uuid_sync.py** - ✅ ACTIVE
- Used by war_stack_create.sh
- Simple, focused, works well
- **Action:** Minor improvements (URL encoding)

### Deprecated Scripts (Remove/Archive)

**3. ticktick_tag_watcher.py** - ⚠️ DEPRECATED
- Old polling pattern
- Replaced by Bridge + UUID system
- **Action:** Move to `deprecated/` or remove

---

## Integration with aos-hub

### Current State

```
scripts/ticktick/
├── ticktick_sync.py          # ✅ Core4 sync (active)
├── door_uuid_sync.py         # ✅ Door UUID sync (active)
├── ticktick_tag_watcher.py   # ⚠️ Tag watcher (deprecated)
└── README.md                 # Short overview
```

### Recommended Structure

```
scripts/ticktick/
├── ticktick_sync.py          # ✅ Core4 sync
├── door_uuid_sync.py         # ✅ Door UUID sync
├── README.md                 # Updated overview
├── ANALYSIS.md               # This file (technical deep-dive)
└── deprecated/
    └── ticktick_tag_watcher.py  # Archived for reference
```

---

## Future Enhancements

### Short Term

1. **ticktick_sync.py:**
   - [ ] Cache Gemini classifications (reduce API calls)
   - [ ] Add `--watch` mode (inotify on Taskwarrior db)
   - [ ] Batch Gemini requests (classify multiple tasks at once)

2. **door_uuid_sync.py:**
   - [ ] Configurable vault path (env var)
   - [ ] Proper URL encoding (`urllib.parse.quote`)
   - [ ] Reverse sync (TickTick → Taskwarrior annotation)

3. **Documentation:**
   - [ ] Add example systemd timer for ticktick_sync.py --sync
   - [ ] Add example Taskwarrior hook setup
   - [ ] Add troubleshooting guide

### Long Term

1. **Unified TickTick Client:**
   - Extract TickTick API client to shared module
   - Reuse across ticktick_sync.py, door_uuid_sync.py, war_stack_create.sh

2. **Real-time Sync:**
   - TickTick webhooks instead of polling
   - Taskwarrior hooks trigger immediate sync (not just on-add)

3. **War Stack Integration:**
   - Auto-sync War Stack Hits to TickTick (via ticktick_sync.py pattern)
   - UUID mapping for War Stack tasks (like Core4)

---

## Migration Notes

**From .dotfiles/bin/ → aos-hub/scripts/ticktick/:**

✅ **Completed:**
- ticktick_sync.py copied
- door_uuid_sync.py copied
- ticktick_tag_watcher.py copied
- README.md created (short version)

**Next Steps:**
1. Archive ticktick_tag_watcher.py to deprecated/
2. Update README.md with full overview (link to ANALYSIS.md)
3. Create systemd timer examples
4. Test ticktick_sync.py in aos-hub context

---

## Conclusion

**Active Scripts:** 2/3 (67%)
**Deprecated Scripts:** 1/3 (33%)

**Overall Quality:** ✅ EXCELLENT
- ticktick_sync.py is sophisticated (Gemini AI, bidirectional sync, logging)
- door_uuid_sync.py is simple and focused
- Both scripts are production-ready

**Recommendation:** Keep ticktick_sync.py and door_uuid_sync.py, archive ticktick_tag_watcher.py

---

**Last Updated:** 2026-01-02
**Analyzed by:** Claude Sonnet 4.5
