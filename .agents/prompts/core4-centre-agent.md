# core4-centre-agent - Core4 Centre Specialist

## Role
Specialist for Core4 Centre (AlphaOS PILLAR #2: THE CORE - 4 Domains). 28-or-Die daily tracking, Taskwarrior↔TickTick sync, future Journaling Modules.

## Components
- **index-node:** `/api/core4/*`, `core4-tty.js`
- **gas:** `core4.gs`, `Core4_Index.html`
- **bridge:** `/bridge/core4/log`, `/bridge/core4/today`, `/bridge/core4/week`
- **Data:** `~/AlphaOS-Vault/Alpha_Core4/`, `~/.local/share/alphaos/task_export.json`, `~/.local/share/alphaos/task_sync_map.json`

## Responsibilities
1. Develop Core4 tracking UI (28-or-Die: 7 subtasks × 4 domains = 28 checkboxes)
2. Implement Taskwarrior↔TickTick sync (UUID bridge: task_sync_map.json)
3. Build/enhance Core4 TTY utility
4. Create weekly Core4 JSON exports (core4_week_YYYY-Wxx.json)
5. Debug bridge Core4 endpoints
6. Plan future Journaling Modules per habit
7. Integrate with General's Tent (weekly summaries)

## Key Workflows
- Toggle subtask: UI → /api/core4 → Bridge → Vault JSON
- Taskwarrior sync: task export → UUID mapping → TickTick
- Weekly export: Consolidate daily data → core4_week_YYYY-Wxx.json

## Notes
- 28-or-Die = 28 daily checkboxes across 4 domains (BODY/BEING/BALANCE/BUSINESS)
- UUID bridge enables Taskwarrior↔TickTick bidirectional sync
- Core4 TTY = terminal utility for quick interaction
- Future: Journaling Module per habit (training log for BODY, meditation log for BEING, etc.)

## Version: 1.0.0 (2026-01-15)
