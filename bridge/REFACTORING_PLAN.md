# Bridge Refactoring Plan - Deep Modularization

## Context

**Why this refactoring:**
The bridge service (app.py) has grown to 2,679 lines with 26 handlers across 10 functional domains. While it works, it's becoming difficult to maintain, test, and extend. The monolithic structure makes it hard to:
- Test individual features in isolation
- Understand dependencies between domains
- Add new features without risk of breaking existing ones
- Onboard new developers to the codebase

**Current pain points:**
- Single 2,679-line file with all logic
- 82+ helper functions mixed throughout
- Cross-domain dependencies not explicit
- Global state (7 locks, SYNC_STATUS dict)
- Difficult to unit test individual handlers
- selftest.py tests everything at once

**Desired outcome:**
- Clean modular architecture with explicit dependencies
- app.py reduced to <200 lines (thin entrypoint)
- Handlers grouped by domain in separate modules
- Shared utilities in common library
- Easier testing per module
- Zero-downtime deployment (via symlink + restart)

---

## Recommended Architecture

### Option: **Incremental Modular Split** (RECOMMENDED)

Simpler than Router's Extension system, but maintains clean separation:

```
bridge/
├── app.py                      # Thin entrypoint (<200 lines)
│   - Creates aiohttp app
│   - Registers all routes
│   - Starts server
│
├── middleware.py               # Auth + logging middleware
│   - auth_middleware
│   - request_log_middleware
│
├── config.py                   # Configuration loading
│   - Load all env vars
│   - Export as Config dataclass
│   - Single source of truth
│
├── state.py                    # Shared application state
│   - Locks (7 total)
│   - SYNC_STATUS dict
│   - Other shared state
│
├── common.py                   # Shared utilities (~400 lines)
│   - Time: _now, _parse_ts, _week_key, _date_key
│   - JSON: _load_json, _save_json, _read_json
│   - Numbers: _safe_float, _parse_float
│   - Paths: _ensure_dir, _safe_name
│   - Command: _run_cmd, _stream_reader
│   - Git: _git_rev_short, _git_info
│
├── handlers/                   # HTTP handlers by domain
│   ├── __init__.py            # Re-exports all route builders
│   │
│   ├── core4.py               # Core4 domain (~600 lines)
│   │   - Handlers: handle_core4_log, handle_core4_week, handle_core4_today, handle_core4_pull
│   │   - Helpers: All _core4_* functions (22 total)
│   │   - Locks: core4_lock, core4_push_lock
│   │
│   ├── fire.py                # Fire/Report domain (~350 lines)
│   │   - Handlers: handle_bridge_fire_daily, handle_bridge_trigger_weekly_firemap, handle_bridge_daily_review_data
│   │   - Helpers: _run_firemap_and_log, _run_firectl_print, _format_fire_daily_message
│   │   - Locks: fire_daily_lock, firemap_lock
│   │   - Imports: core4 (for data access)
│   │
│   ├── sync.py                # Sync/Drive domain (~500 lines)
│   │   - Handlers: handle_sync_push, handle_sync_pull, handle_sync_status, handle_sync_abort
│   │   - Helpers: All _sync_*, _rclone_* functions (14 total)
│   │   - Locks: sync_status_lock
│   │   - State: SYNC_STATUS dict
│   │
│   ├── task.py                # Task domain (~400 lines)
│   │   - Handlers: handle_task_operation, handle_task_execute, handle_task_modify
│   │   - Helpers: All _run_task_*, _get_task_uuid, _complete_core4_tw_task (7 total)
│   │   - Imports: core4 (for habit completion)
│   │
│   ├── queue.py               # Queue/Telegram domain (~350 lines)
│   │   - Handlers: handle_queue_flush, handle_telegram_send
│   │   - Helpers: _send_tele*, _post_to_gas, _enqueue_payload, _list_queue_files (10 total)
│   │   - Locks: queue_lock
│   │
│   ├── game.py                # Fruits/Tent/WarStack domain (~300 lines)
│   │   - Handlers: handle_fruits_answer, handle_tent_summary, handle_tent_sync, handle_tent_fetch, handle_warstack_draft
│   │   - Helpers: _fruits_store_path
│   │   - Locks: fruits_lock
│   │   - Imports: sync (for rclone operations)
│   │
│   └── meta.py                # Meta/diagnostic domain (~250 lines)
│       - Handlers: handle_health, handle_version, handle_debug, handle_doctor, handle_rpc
│       - Helpers: _probe_bin, _resolve_bin
│       - Imports: All modules (for diagnostics)
│
└── lib/                       # Helper scripts (unchanged)
    ├── setup-notifications.sh
    └── bridge-lib.sh
```

**Total reduction:**
- app.py: 2,679 → ~150 lines (94% reduction)
- Handlers: Split into 7 modules (~2,850 lines total with tests)
- Common: ~400 lines of shared utilities
- Config/State/Middleware: ~200 lines

---

## Import Dependency Graph

```
app.py
  ├─> config.py (env vars)
  ├─> state.py (locks, SYNC_STATUS)
  ├─> middleware.py
  └─> handlers/
      ├─> meta.py
      │     └─> (imports all other handlers for diagnostics)
      │
      ├─> core4.py
      │     ├─> common.py
      │     ├─> config.py
      │     └─> state.py (core4_lock, core4_push_lock)
      │
      ├─> fire.py
      │     ├─> common.py
      │     ├─> config.py
      │     ├─> state.py (fire_daily_lock, firemap_lock)
      │     └─> core4.py (for data access)
      │
      ├─> sync.py
      │     ├─> common.py
      │     ├─> config.py
      │     └─> state.py (sync_status_lock, SYNC_STATUS)
      │
      ├─> task.py
      │     ├─> common.py
      │     ├─> config.py
      │     └─> core4.py (for _complete_core4_tw_task)
      │
      ├─> queue.py
      │     ├─> common.py
      │     ├─> config.py
      │     └─> state.py (queue_lock)
      │
      └─> game.py
            ├─> common.py
            ├─> config.py
            ├─> state.py (fruits_lock)
            └─> sync.py (for rclone operations)
```

**Dependency Rules:**
- `common.py` has ZERO dependencies (pure utilities)
- `config.py` depends only on stdlib (reads env vars)
- `state.py` depends only on stdlib (defines locks/state)
- Handler modules can import: common, config, state, and specific other handlers
- `meta.py` is special (imports all handlers for diagnostics)

---

## Critical Files to Modify

**Create new files:**
1. `~/aos-hub/bridge/config.py` - Configuration dataclass
2. `~/aos-hub/bridge/state.py` - Shared state (locks, SYNC_STATUS)
3. `~/aos-hub/bridge/middleware.py` - Auth + logging middleware
4. `~/aos-hub/bridge/common.py` - Shared utilities
5. `~/aos-hub/bridge/handlers/__init__.py` - Handler registry
6. `~/aos-hub/bridge/handlers/core4.py` - Core4 handlers
7. `~/aos-hub/bridge/handlers/fire.py` - Fire handlers
8. `~/aos-hub/bridge/handlers/sync.py` - Sync handlers
9. `~/aos-hub/bridge/handlers/task.py` - Task handlers
10. `~/aos-hub/bridge/handlers/queue.py` - Queue/Telegram handlers
11. `~/aos-hub/bridge/handlers/game.py` - Fruits/Tent/WarStack handlers
12. `~/aos-hub/bridge/handlers/meta.py` - Meta/diagnostic handlers

**Modify existing:**
1. `~/aos-hub/bridge/app.py` - Rewrite as thin entrypoint
2. `~/aos-hub/bridge/selftest.py` - Update imports (test stays same)
3. `~/aos-hub/bridge/AGENTS.md` - Document new architecture
4. `~/aos-hub/bridge/CLAUDE.md` - Update development guidelines
5. `~/aos-hub/CHANGELOG.md` - Add refactoring entry

**No changes needed:**
- `bridgectl` (works with app.py regardless of internal structure)
- Systemd services (ExecStart unchanged)
- `/opt/aos/bridge` symlink (unchanged)
- Environment files (unchanged)

---

## Implementation Steps

### Phase 1: Extract Shared Infrastructure (Foundation)

**Step 1.1: Create config.py**
- Extract all env var loading from app.py
- Create Config dataclass with all settings
- Preserve module-level loading pattern

**Step 1.2: Create state.py**
- Move all locks (7 total) to State dataclass
- Move SYNC_STATUS dict to State
- Initialize state once in app.py

**Step 1.3: Create middleware.py**
- Extract auth_middleware
- Extract request_log_middleware
- Keep same signatures

**Step 1.4: Create common.py**
- Extract shared utilities (~30 functions)
- Group by category (time, json, paths, numbers, git, command)
- Zero dependencies

**Verification:**
- Run selftest (should still pass with imports updated)
- Check bridgectl health

---

### Phase 2: Extract Domain Handlers (Core Domains)

**Step 2.1: Create handlers/core4.py**
- Extract 4 Core4 handlers
- Extract 22 Core4 helper functions
- Import: common, config, state
- Preserve handler signatures

**Step 2.2: Create handlers/sync.py**
- Extract 4 Sync handlers
- Extract 14 Sync/rclone helpers
- Import: common, config, state
- Independent (no other handler imports)

**Step 2.3: Create handlers/queue.py**
- Extract queue_flush + telegram_send handlers
- Extract 10 queue/telegram helpers
- Import: common, config, state
- Independent

**Verification after each step:**
- Run selftest (update imports as needed)
- Test specific endpoints via bridgectl

---

### Phase 3: Extract Dependent Handlers

**Step 3.1: Create handlers/fire.py**
- Extract 3 Fire handlers
- Extract 3 Fire helpers
- Import: common, config, state, core4
- Depends on core4 for data

**Step 3.2: Create handlers/task.py**
- Extract 3 Task handlers
- Extract 7 Task helpers
- Import: common, config, state, core4
- Depends on core4 for habit completion

**Step 3.3: Create handlers/game.py**
- Extract 5 Fruits/Tent/WarStack handlers
- Extract 1 Fruits helper
- Import: common, config, state, sync
- Depends on sync for rclone

**Verification:**
- Run selftest (all handlers should work)
- Test cross-domain operations (fire daily, task completion)

---

### Phase 4: Extract Meta Handlers & Finalize

**Step 4.1: Create handlers/meta.py**
- Extract 5 Meta handlers (health, version, debug, doctor, rpc)
- Extract diagnostic helpers
- Import: ALL other handlers (for diagnostics)
- Special case (meta-layer)

**Step 4.2: Create handlers/__init__.py**
- Import all handlers
- Export route lists per domain
- Provide get_all_routes() function

**Step 4.3: Rewrite app.py as thin entrypoint**
- Import: config, state, middleware, handlers
- create_app() function:
  - Load config
  - Initialize state
  - Create aiohttp.Application(middlewares=[...])
  - Register all routes from handlers
  - Return app
- __main__ block:
  - Parse args
  - Call create_app()
  - Run web.run_app()

**Verification:**
- Run complete selftest suite
- Run bridgectl doctor (full diagnostics)
- Test all endpoints manually

---

### Phase 5: Update Documentation & Deploy

**Step 5.1: Update AGENTS.md**
- Document new architecture
- Explain module boundaries
- Reference Router Bot pattern
- Update development workflows

**Step 5.2: Update CLAUDE.md**
- Update development guidelines
- Explain how to add new handlers
- Document import rules
- Update testing section

**Step 5.3: Update TODO.md**
- Add future refactoring ideas
- Note potential improvements

**Step 5.4: Update ~/aos-hub/CHANGELOG.md**
- Add entry for refactoring
- Note breaking changes (none for external API)
- List all new files

**Step 5.5: Commit changes**
- Stage all new files
- Commit with detailed message
- Push to remote

**Step 5.6: Deploy**
- Bridge is symlinked (changes are already live)
- Restart service: `bridgectl restart`
- Monitor logs: `bridgectl logs`
- Run smoke tests

---

## Testing Strategy

### Unit Testing (Per Module)

Create `bridge/tests/` directory:
```
tests/
├── test_common.py      # Test shared utilities
├── test_config.py      # Test config loading
├── test_core4.py       # Test Core4 handlers
├── test_sync.py        # Test Sync handlers
├── test_task.py        # Test Task handlers
└── ... more
```

**Pattern:**
- Use StubRequest (from selftest.py)
- Test handlers in isolation
- Mock dependencies (e.g., subprocess calls)
- Test helper functions independently

### Integration Testing (Existing)

**selftest.py** stays mostly the same:
- Update imports to new modules
- Test end-to-end handler behavior
- Validate JSON responses
- Check file writes

**Validation:**
```bash
cd ~/aos-hub/bridge
python selftest.py  # Should return 0
```

### Smoke Testing (Manual)

```bash
bridgectl restart
bridgectl health        # GET /health
bridgectl debug         # GET /debug + RPC test
bridgectl doctor        # Full diagnostics

# Test Core4
bridgectl core4-log body fitness
bridgectl core4-today

# Test sync
curl -X POST http://127.0.0.1:8080/bridge/sync/push

# Check logs
bridgectl logs
```

---

## Rollback Plan

**If refactoring breaks production:**

1. **Immediate rollback (5 minutes):**
   ```bash
   cd ~/aos-hub/bridge
   git revert HEAD      # Revert refactoring commit
   bridgectl restart    # Restart with old code
   bridgectl health     # Verify service is up
   ```

2. **Verify rollback:**
   ```bash
   python selftest.py   # Should pass
   bridgectl doctor     # Check all systems
   ```

3. **Fix forward (preferred):**
   - Identify broken module
   - Fix imports or handler signature
   - Test with selftest
   - Commit fix
   - Restart service

**Rollback safety:**
- All changes are in git
- Symlink means restart = deploy
- No database migrations needed
- Env vars unchanged
- External API unchanged

---

## Migration Strategy: INCREMENTAL (Recommended)

**Why incremental:**
- Lower risk (test each module before next)
- Easier debugging (know what broke)
- Can pause/resume at any phase
- Validate each step with selftest

**Phases:**
1. Foundation (config, state, middleware, common) - 1 session
2. Independent handlers (core4, sync, queue) - 1 session
3. Dependent handlers (fire, task, game) - 1 session
4. Meta + finalize (meta, app.py rewrite) - 1 session
5. Documentation + deploy - 1 session

**Total time:** ~3-5 sessions (can spread over days)

**Alternative - Big Bang:**
- Refactor everything in one go
- Higher risk (all or nothing)
- Faster if successful
- More debugging if issues

**Recommendation:** Incremental (safer for production service)

---

## Handler Signature Preservation

**CRITICAL:** Selftest compatibility requires exact signatures.

**Current pattern:**
```python
async def handle_core4_log(request: web.Request) -> web.Response:
    try:
        data = await _read_json(request)
        # ... logic
        return web.json_response({"ok": True, ...})
    except Exception as e:
        LOGGER.error("core4 log failed: %s", e)
        return web.json_response({"ok": False, "error": str(e)}, status=500)
```

**After refactoring (in handlers/core4.py):**
```python
# handlers/core4.py
from aiohttp import web
from ..common import read_json, now, week_key
from ..config import config
from ..state import state

async def handle_core4_log(request: web.Request) -> web.Response:
    try:
        data = await read_json(request)  # from common
        # ... logic uses config, state
        return web.json_response({"ok": True, ...})
    except Exception as e:
        LOGGER.error("core4 log failed: %s", e)
        return web.json_response({"ok": False, "error": str(e)}, status=500)
```

**Same signature, different imports.**

---

## Verification Checklist

After refactoring is complete:

- [ ] `python selftest.py` returns 0
- [ ] `bridgectl health` returns 200 OK
- [ ] `bridgectl debug` shows correct version
- [ ] `bridgectl doctor` passes all probes
- [ ] Core4 log works: `bridgectl core4-log body fitness`
- [ ] Core4 today works: `bridgectl core4-today`
- [ ] Desktop notifications appear (if enabled)
- [ ] Telegram notifications work (if configured)
- [ ] Service restarts without errors: `bridgectl restart`
- [ ] Logs show no errors: `bridgectl logs | tail -50`
- [ ] All 26 handlers are registered (check /debug output)
- [ ] AGENTS.md updated with new architecture
- [ ] CLAUDE.md updated with new workflows
- [ ] CHANGELOG.md has entry for refactoring

---

## Benefits of This Approach

**Maintainability:**
- Clear module boundaries (know where to find code)
- Explicit dependencies (imports show relationships)
- Easier to understand for new developers

**Testability:**
- Unit test individual modules
- Mock dependencies cleanly
- Faster test execution (don't need full app)

**Extensibility:**
- Add new handlers by creating new module
- Import existing utilities from common
- Follow established patterns

**Safety:**
- Incremental migration (test each step)
- Rollback plan (git revert)
- Same deployment process (symlink + restart)
- Selftest validates compatibility

**Performance:**
- No runtime overhead (same async handlers)
- Import time slightly higher (negligible)
- Same response times

---

## Next Steps (After Plan Approval)

1. Start with Phase 1 (Foundation) - create config.py, state.py, middleware.py, common.py
2. Update selftest.py imports and verify it still passes
3. Proceed to Phase 2 (Core4, Sync, Queue handlers)
4. Continue through phases incrementally
5. Deploy and verify with smoke tests

**Estimated total time:** 4-6 hours across multiple sessions

---

## Open Questions (None - Plan is Complete)

All exploration findings have been incorporated. Ready to proceed with implementation.
