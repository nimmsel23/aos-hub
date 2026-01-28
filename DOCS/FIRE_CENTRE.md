# Fire Centre Documentation (Fire Map System)

**Purpose:** Produce daily/weekly Fire execution snapshots from Taskwarrior and send them to Telegram; optionally write a vault chronicle markdown.

---

## UX Focus (Read-First)

The Fire Centre should primarily **show what already exists** before creating anything new:

- Current-week Fire Map entries (weekly + daily)
- Scheduled tasks (calendar view) so timing is visible
- TickTick tasks that were pushed from Fire tags
- A daily consolidated task list (single view of today’s actions)
- A 7-day consolidated view (upcoming week)
- Journal-friendly inputs remain so you can backfill what you did yesterday.
- Fire Map markdown files serve as the Obsidian journal log for profit/review.

---

## Setup Matrix (Sources)

```
Online (Local):
  - Daily/Weekly: Taskwarrior (tags: +fire +production +hit, scheduled/due)
  - Push: Taskwarrior hook -> TickTick
  - UI: Index-Node Fire Centre (/game/fire)

Online (Remote):
  - Daily/Weekly: Drive task snapshot (`task_export.json`)
  - UI: GAS Fire Centre + Fire Bot polling (/fire, /fireweek)

Offline (Local only):
  - Daily/Weekly: Taskwarrior + Vault Fire Maps
```

---

## Components (Current)

- **Fire Centre UI (GAS):** `gas/game_fire.gs` + `gas/Game_Fire_Index.html`  
  Captures weekly + daily entries; stores markdown in Google Drive; shows embedded GCal + TickTick tasks.
- **Fire Centre UI (Local):** `index-node/public/game/fire.html`  
  Local front-end entry point for Fire Maps.
- **Node API (Local):** `/api/fire/day` and `/api/fire/week` (aliases: `/fired`, `/firew`)
- **Firemap engine:** `python-firemap/firemap.py`  
  Taskwarrior (+fire) → Markdown-formatted text messages (due/scheduled + waiting; overdue separate; grouped per project).
- **Fire Bot (local, Telegram):** `python-firemap/firemap_bot.py`  
  Sends daily/weekly snapshots to Telegram (text, not files). Config in `python-firemap/.env`.
- **Terminal wrapper:** `scripts/firectl`  
  Wrapper/installer for the bot; `firectl print` matches `/fire` output; `firectl build` writes the same output into the vault as markdown.
- **Legacy markdown sync (optional):** `firemap sync` → `scripts/utils/fire-to-tasks.sh`  
  Legacy flow that converts existing `FIRE_MAP_*` markdown files into Taskwarrior tasks.
- **TickTick Push (via Taskwarrior hooks):**  
  Fire tasks are pushed when tagged `+fire +production +hit` (legacy + Fire Centre flow).
- **Calendar (UI-only, optional):**  
  TickTick/GCal can be embedded in the Fire Centre UI, but `/fire` snapshots come from Taskwarrior via Drive `task_export.json`.
- **Fire Bot (Telegram):** `python-firemap/firemap_bot.py`  
  Sends daily/weekly snapshots from Taskwarrior to Telegram.
- **Fire Bot (GAS, Telegram polling):** `gas/fire_bot.gs`  
  Always-on `/fire` + `/fireweek` from Drive `task_export.json` (no Bridge required). Requires `AOS_TASK_EXPORT_FILE_ID` (or the file is discoverable in `AlphaOS-Vault/.alphaos`).
- **Router Trigger:** `router/extensions/firemap_commands.py`  
  `/fire` (daily) + `/fireweek` (weekly) run the python bot locally.

---

## Concept Drawing (Data Flow)

```
                    ┌──────────────────────────────────┐
                    │ Fire Centre UI (GAS)              │
                    │ gas/game_fire.gs + Game_Fire_...  │
                    │ - weekly + daily capture          │
                    │ - Drive storage (+ optional TT)   │
                    └──────────────────┬───────────────┘
                                       │
                                       │
                                       │ tasks (+fire) are the source of truth
                                       v
                      ┌──────────────────────────┐
                      │ Taskwarrior              │
                      │ +fire tasks              │
                      └────────────┬─────────────┘
                                   │
                                   │ daily/weekly snapshot
                                   v
┌────────────────────────────────────────────────────────────┐
│ Python Fire Bot                                            │
│ python-firemap/firemap_bot.py                           │
│ - sender: API/tele/auto (AOS_FIREMAP_SENDER)                │
│ - engine: python-firemap/firemap.py                     │
└───────────────────────────────┬────────────────────────────┘
                                │
                                v
                         Telegram chat
```

---

## On-Demand Trigger (Router)

```
Telegram /fire or /fireweek
        │
        v
Router Bot (firemap_commands)
        │
        v
python-firemap (daily/weekly)
        │
        v
Telegram snapshot
```

---

## Planned

- **GCal Integration (Fire Centre):** allow direct task creation with time blocks from the Fire Centre UI.
- **Scheduling Rule:** Fire Map tasks should include a scheduled date so they appear in calendar views.

---

## Chapter 39 Logic (Machine)

```yaml
chapter_ref: "Chapter 39 - The Fire"
concept: "Fire Map"
purpose: "Weekly commitment map for immediate action"
inputs:
  - ipw: "Ideal Parallel World"
  - annual_freedom_map
  - monthly_mission
  - focus_map
structure:
  domains: ["Body", "Being", "Balance", "Business"]
  tasks_per_domain: 4
  total_weekly_tasks: 16
rules:
  - "tasks are non-negotiable actions for the week"
  - "every task must align to monthly_mission and annual_freedom_map"
  - "each task should have a scheduled date"
alignment_chain:
  - "weekly Fire Map -> monthly mission (4 weeks)"
  - "monthly missions -> annual freedom game (12 months)"
outputs:
  - fire_map_weekly
  - fire_map_daily
  - daily_consolidated_task_list
cadence:
  weekly: "define 4x4 actions per domain"
  daily: "review + execute scheduled actions"
```

---

## Chapter 40 Logic (Machine)

```yaml
chapter_ref: "Chapter 40 - The Daily"
concept: "Daily Game"
purpose: "Daily execution layer aligned to weekly/monthly/annual maps"
inputs:
  - ipw: "Ideal Parallel World"
  - annual_freedom_map
  - monthly_mission
  - fire_map_weekly
  - voice_alignment
structure:
  trinity:
    power: "The Core (Body/Being/Balance/Business promises)"
    perspective: "The Voice (daily alignment)"
    production: "The Door (priority tasks)"
rules:
  - "daily tasks derive from Fire Map + Door + Voice"
  - "daily actions must align to monthly_mission and annual_freedom_map"
  - "maintain balance across Body/Being/Balance/Business"
outputs:
  - daily_consolidated_task_list
  - daily_schedule
cadence:
  daily: "review maps -> choose priorities -> execute"
```

---

## Chapter 35 Logic (Machine)

```yaml
chapter_ref: "Chapter 35 - Fire"
concept: "Fire Map (Weekly War)"
purpose: "Weekly execution map that turns long-term vision into immediate action"
inputs:
  - frame_map
  - freedom_map
  - focus_map
structure:
  cadence: "weekly"
  emphasis: "simplicity + clarity"
rules:
  - "weekly tasks are small, deliberate, and actionable"
  - "each weekly action supports the long-term vision"
  - "weekly wins compound across the year"
outputs:
  - fire_map_weekly
  - weekly_war_checklist
alignment_chain:
  - "weekly war -> monthly mission -> annual freedom game"
```
