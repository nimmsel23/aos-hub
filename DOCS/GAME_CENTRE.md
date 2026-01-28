# Game Centre Documentation (Fact Maps System)

**Purpose:** Provide a single operational hub for the Fact Maps system and the daily game.

---

## Scope

Chapters covered by the Game Centre concept:

- 32 Frame
- 33 Freedom
- 34 Focus
- 35 Fire
- 36 Game
- 37 Life
- 38 Mission
- 39 The Fire
- 40 The Daily
- 41 The General's Tent
- 42 The Alpha Odyssey

---

## UX Focus (Read-First)

The Game Centre should primarily show what already exists before creating anything new:

- Current Frame/Freedom/Focus/Fire maps
- Daily consolidated task list (single view of today's actions)
- Calendar view (scheduled tasks)
- TickTick tasks that were pushed from Taskwarrior tags

---

## Components (Current)

- **Local Game Centre UI:** `index-node/public/game/index.html`  
  Entry point to the Game Centre pages.
- **GAS Game Centre UI:** `gas/Game_Tent_Index.html` + `gas/Game_*_Index.html`  
  Remote fallback for Frame/Freedom/Focus/Fire centres.
- **Vault Exports:**  
  `~/AlphaOS-Vault/Game/Frame`  
  `~/AlphaOS-Vault/Game/Freedom`  
  `~/AlphaOS-Vault/Game/Focus`  
  `~/AlphaOS-Vault/Game/Fire`
- **Node Fire API (Local):** `/api/fire/day` + `/api/fire/week` (aliases: `/fired`, `/firew`)
- **Task System:**  
  Fire tasks live in Taskwarrior (`+fire`) and are printed/sent via the Firemap engine (`python-firemap/firemap.py`).
  - Terminal: `firemap print daily|weekly` (or `firectl print daily|weekly`)
  - Telegram: `/fire` and `/fireweek` (local python bot; GAS fallback when offline)
- **TickTick Push (Optional):**  
  Taskwarrior tasks tagged `+fire +production +hit` push into TickTick.
- **Calendar Embed:**  
  GCal embed is shown inside the Fire Centre UI (planned for direct creation).

---

## Concept Flow (Data)

```
Frame Map (truth / facts)
    -> Freedom Map (IPW vision)
        -> Focus Map (monthly mission)
            -> Fire Map (weekly war)
                -> Daily Game (today's actions)
                    -> General's Tent (weekly review)

Maps export -> Vault
Fire Map -> Taskwarrior -> TickTick (tags) + Calendar (scheduled)
Daily Game -> consolidated list (Taskwarrior + TickTick + scheduled)
```

---

## Chapter Logic (Machine)

```yaml
chapter_ref: "Chapter 32 - Frame"
concept: "Frame Map"
purpose: "Establish current reality and facts"
inputs:
  - current_state
  - domain_review: ["Body", "Being", "Balance", "Business"]
rules:
  - "answer where am I, how did I get here, what works, what does not"
outputs:
  - frame_map
```

```yaml
chapter_ref: "Chapter 33 - Freedom"
concept: "Freedom Map"
purpose: "Define IPW (Ideal Parallel World)"
inputs:
  - frame_map
  - truth_alignment
rules:
  - "vision must be bold and specific"
  - "dream in all four domains"
outputs:
  - freedom_map
  - ipw
```

```yaml
chapter_ref: "Chapter 34 - Focus"
concept: "Focus Map"
purpose: "Monthly mission that bridges now to IPW"
inputs:
  - freedom_map
  - frame_map
rules:
  - "break vision into actionable monthly steps"
  - "define habits, routines, additions, eliminations"
outputs:
  - focus_map
  - monthly_mission
```

```yaml
chapter_ref: "Chapter 35 - Fire"
concept: "Fire Map (Weekly War)"
purpose: "Weekly execution map for immediate action"
inputs:
  - focus_map
  - monthly_mission
structure:
  domains: ["Body", "Being", "Balance", "Business"]
  tasks_per_domain: 4
rules:
  - "weekly tasks are simple, clear, actionable"
  - "weekly wins compound across the year"
outputs:
  - fire_map_weekly
```

```yaml
chapter_ref: "Chapter 36 - Game"
concept: "Game (Synthesis)"
purpose: "Unify Frame, Freedom, Focus, Fire into one system"
inputs:
  - frame_map
  - freedom_map
  - focus_map
  - fire_map_weekly
rules:
  - "each layer feeds the next"
outputs:
  - game_centre_flow
```

```yaml
chapter_ref: "Chapter 37 - Life"
concept: "Life Alignment"
purpose: "Live the system daily, not just plan it"
inputs:
  - frame_map
  - freedom_map
  - focus_map
rules:
  - "truth and daily behavior must match"
outputs:
  - daily_alignment
```

```yaml
chapter_ref: "Chapter 38 - Mission"
concept: "Monthly Mission"
purpose: "Monthly compression of the IPW"
inputs:
  - freedom_map
  - frame_map
rules:
  - "monthly review and course correction"
  - "set measurable outcomes per domain"
outputs:
  - monthly_mission
  - focus_map
```

```yaml
chapter_ref: "Chapter 39 - The Fire"
concept: "Fire Map"
purpose: "Weekly commitment map for immediate action"
inputs:
  - focus_map
  - monthly_mission
structure:
  domains: ["Body", "Being", "Balance", "Business"]
  tasks_per_domain: 4
outputs:
  - fire_map_weekly
  - fire_map_daily
```

```yaml
chapter_ref: "Chapter 40 - The Daily"
concept: "Daily Game"
purpose: "Daily execution aligned to maps"
inputs:
  - fire_map_weekly
  - voice_alignment
  - core_promises
rules:
  - "daily tasks derive from fire map + door + voice"
  - "tasks should be scheduled"
outputs:
  - daily_consolidated_task_list
  - daily_schedule
```

```yaml
chapter_ref: "Chapter 41 - The General's Tent"
concept: "Weekly Review"
purpose: "Return and report, learn, correct course, set new targets"
inputs:
  - weekly_results
  - monthly_mission
  - freedom_map
structure:
  components:
    - return_and_report
    - lessons_learned
    - course_correction
    - new_targets
outputs:
  - weekly_review_log
  - updated_focus_map
  - updated_fire_map
```

```yaml
chapter_ref: "Chapter 42 - The Alpha Odyssey"
concept: "Odyssey"
purpose: "Synthesize Code + Fact Maps + Voice + Core + Door into one path"
inputs:
  - frame_map
  - freedom_map
  - focus_map
  - fire_map_weekly
  - daily_game
rules:
  - "system is lived, not just planned"
outputs:
  - odyssey_path
```
