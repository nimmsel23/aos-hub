# Fire Centre Documentation

**Fire Map** - Weekly War Execution System (Part of THE GAME)

**Last Updated:** 2026-01-10

---

## Table of Contents

1. [AlphaOS Philosophy: What MUST Be](#alphaos-philosophy-what-must-be)
2. [Implementation: What IS](#implementation-what-is)
3. [Testing](#testing)

---

## AlphaOS Philosophy: What MUST Be

> "The Fire Map lights up your weekly and daily path, keeping you from falling into procrastination or doubt. Every week, you ignite a new flame, guiding you steadily toward the top of your mountain." — Elliott Hulse

### Purpose

**Weekly War Execution** - Transform monthly Focus into weekly tactical action through deliberate, consistent strikes.

**Position in THE GAME Hierarchy:**

```
FRAME (Where am I?)
  ↓
IPW (10-year Ideal Parallel World)
  ↓
FREEDOM (Annual vision - How do I get there?)
  ↓
FOCUS (Monthly mission - What to do to stay on course?)
  ↓
FIRE (Weekly war - Specific tasks RIGHT NOW) ← YOU ARE HERE
  ↓
DAILY GAME (Daily execution)
```

**The Cascade:** With your Frame established, your Freedom defined, and your Focus set, you're ready to break it down even further into **weekly tasks**. This ensures you keep momentum and stay consistent.

---

## What MUST Happen

### 1. EMBRACING THE WEEKLY WAR

**Philosophy:**
- "The Fire Map" is your **weekly guide**
- Highlights specific tasks you need to tackle **right now**
- Where your journey truly begins, where rubber meets the road
- Every great quest = small, deliberate steps

**The Weekly War Concept:**
- Wars aren't won in one big move
- They're won through **series of decisive battles**
- Same goes for achieving your big dream
- Not about one giant leap but about **winning, week by week**

**Maritime Metaphor:**
- Think: preparing to set sail on long journey
- Before facing open seas, you need to:
  - Check supplies
  - Make sure crew is ready
  - Ensure ship is in top shape
- Fire Map = weekly checklist to ensure you're fully prepared

---

### 2. WEEKLY WAR: TACTICAL PRECISION

**What It Looks Like:**

Before you set sail (start your week), you:
1. Review your Focus Map (monthly mission)
2. Break it into **weekly strikes**
3. Define exactly what needs to get done **this week**
4. Create your Fire Map

**Critical:** No confusion, no overwhelming decisions. When weekly tasks are clear and direct, the path to success becomes straight.

---

### 3. WHY SIMPLICITY IS GENIUS

**What You'll Notice:**

When you create your first Fire Map, you might be **surprised by how simple it is**. The tasks are straightforward, almost too simple.

**But that's the point:**
- Breaking big goals into small, weekly tasks makes the impossible feel doable
- It's not about making things easy—it's about **making things clear**
- When things are clear, they become easier to tackle

**Each Week:**
- You'll know exactly what needs to get done
- No confusion
- No overwhelming decisions
- Clear, direct path to success

---

### 4. THE POWER OF CUMULATIVE ACTION

**The Math:**
- 1 Weekly War might seem small compared to Freedom Map grandeur
- BUT: **52 Weekly Wars = 1 victorious year**

**Common Misconception:**
- People think: for something to be life-changing, it must be complicated
- Fire Map proves this WRONG
- Power lies in **simplicity** and **focus on what needs to be done right now**

**The Truth:**
- Winning small battles adds up
- Cumulative action creates transformation
- Success = alignment of daily actions with long-term vision

---

### 5. A WINNING STRATEGY

**The Process:**

1. **Focus on the Week Ahead:**
   - Your eyes on horizon (Focus and Freedom Maps)
   - Your feet stay firmly on ground
   - Moving step by step toward your dream

2. **Light Your Fire:**
   - Each week, you ignite new flame
   - Guides you steadily toward mountain top
   - Keeps you from procrastination or doubt

3. **Win Your Weekly War:**
   - Small, deliberate, consistent actions
   - No grand gestures needed
   - Let the world see the blaze of your success

**Remember:** Achieving the impossible isn't about grand gestures. It's about **small, deliberate, and consistent actions.**

---

## Required Components

### What Fire Map MUST Include

**Per Domain (Body/Being/Balance/Business):**
- **Weekly Strikes** (from War Stack or Focus Map)
- **Daily Ignition** (specific actions for each day)

**Structure:**
- Fire Map = breakdown of 4 Hits from War Stack
- Each Hit can have multiple strikes across the week
- Daily view shows: what needs to happen TODAY

**Outcome:**
- Clear weekly checklist
- No ambiguity
- Tactical precision
- Momentum maintained

---

## Implementation: What IS

### Multi-Platform Architecture

| Platform | Status | Primary Use |
|----------|--------|-------------|
| **GAS (Google Apps Script)** | ✅ ACTIVE | Cloud access, mobile, Google Drive + GCal integration |
| **Node.js (Index Node)** | ✅ ACTIVE | Local API, desktop workflow, Taskwarrior primary source |
| **Python Bot (Fire Map Bot)** | ✅ ACTIVE | Telegram snapshots (daily/weekly) from Taskwarrior |
| **Fire Bot (GAS Telegram)** | ✅ ACTIVE | Always-on `/fire` + `/fireweek` when local offline |

**Integration:** Taskwarrior + TickTick + Google Calendar

---

### Data Flow (Current)

```
┌────────────────────────────────────────────────────────────┐
│ Fire Centre UI (GAS)                                       │
│ gas/game_fire.gs + Game_Fire_Index.html                    │
│ - Weekly + daily capture                                   │
│ - Drive storage                                            │
└──────────────────────┬─────────────────────────────────────┘
                       │
                       │ markdown (weekly + daily)
                       v
┌────────────────────────────────────────────────────────────┐
│ Fire Map Files (canonical format)                          │
│ ~/AlphaOS-Vault/Game/Fire/FIRE_MAP_<DOMAIN>_KW<WW>.md      │
└───────────────────────────┬────────────────────────────────┘
                            │
                            │ firemap sync / fire-to-tasks.sh
                            v
                  ┌──────────────────────────┐
                  │ Taskwarrior              │
                  │ +fire +hit tasks         │
                  └────────────┬─────────────┘
                               │
                               │ tagged tasks push (hooks)
                               v
                  ┌──────────────────────────┐
                  │ TickTick                 │
                  │ (sync via hooks)         │
                  └────────────┬─────────────┘
                               │
                 daily/weekly  │ snapshot
                               v
┌────────────────────────────────────────────────────────────┐
│ Python Fire Map Bot / Fire Bot (GAS)                       │
│ - Sends snapshots to Telegram                             │
│ - /fire (daily) + /fireweek (weekly)                      │
└────────────────────────────────────────────────────────────┘
```

---

### GAS Implementation

#### Entry Points

**UI:**
- `gas/Game_Fire_Index.html` (inline in HQ)
- Embedded GCal view (via `FIRE_GCAL_EMBED_URL`)
- Embedded TickTick tasks

**Backend:**
- `gas/game_fire.gs`

#### Storage (GAS)

**Drive:**
- Root: `Alpha_Game/Fire`
- Subfolders: per-week (e.g., `KW35 2024`)

**Logsheet:**
- `Alpha_Fire_Logsheet` (FireLogs tab)

#### API Functions (GAS)

**Fire Map:**
- `saveFireEntry(data)` - Save weekly/daily Fire Map

**TickTick Integration:**
- `getDailyTasks()` - Get today's tasks from TickTick
- `getWeeklyTasks()` - Get week's tasks from TickTick
- `listProjectTasks()` - List all tasks in TickTick project
- `completeTickTickTask()` - Mark TickTick task done

#### Script Properties (GAS)

**TickTick:**
- `TICKTICK_TOKEN` - TickTick API token
- `TICKTICK_PROJECT_ID` - Default TickTick project for Fire tasks

**Google Calendar:**
- `FIRE_GCAL_EMBED_URL` - Embedded calendar URL (UI only)
- `FIRE_GCAL_CALENDAR_ID` - Legacy (not used for `/fire`)
- `FIRE_GCAL_CALENDAR_NAME` - Legacy (not used for `/fire`)
- `FIRE_GCAL_ICS_URL` - Legacy (not used for `/fire`)

**TickTick ICS (Read-Only):**
- `FIRE_TICKTICK_ICS_URL` - Legacy (not used for `/fire`)

**Drive & Sheets:**
- `FIRE_DRIVE_FOLDER_ID` - Fire Centre Drive folder
- `FIRE_LOG_SHEET_ID` - Fire Map log sheet

#### Fire Bot (GAS Telegram, Always-On)

**Token:**
- `FIRE_BOT_TOKEN` - Separate bot token for Fire Bot

**Commands:**
- `/fire` - Show today's Fire Map (from Drive task_export snapshot)
- `/fireweek` - Show current week's Fire Map

**Polling Mode:**
- Runs independently, polls Telegram
- Works when local machine offline
- Reads from Drive `task_export.json` (`AOS_TASK_EXPORT_FILE_ID`), no Bridge required

#### Notes (GAS)

**Project-Level Properties:**
- Fire uses project-level Script Properties (not per-user)

**TickTick Tasks:**
- Created from Weekly Strikes + Daily Ignition
- Pushed via Taskwarrior hooks (`+fire +production +hit`)

**Google Calendar:**
- UI-only embed (via `FIRE_GCAL_EMBED_URL`)
- Not a data source for GAS Fire Centre
- Not used as `/fire` data source

---

### Node.js Implementation

#### Entry Points

**Web UI:**
- `http://127.0.0.1:8799/game/fire`

**Backend:**
- `index-node/server.js`

#### Storage (Node.js)

**Vault:**
- `~/AlphaOS-Vault/Game/Fire/` (local markdown files)
- Format: `FIRE_MAP_<DOMAIN>_KW<WW>_<YYYY>.md`

#### API Endpoints (Node.js)

**Daily:**
- `GET /api/fire/day` - Today's Fire Map
- Alias: `/fire/day`, `/fired`

**Weekly:**
- `GET /api/fire/week?tag=fire` - Current week's Fire Map
- Alias: `/fire/week`, `/firew`

**Export:**
- `GET /api/game/export` - Export Fire Map data

**Data Source Priority:**
1. **Primary:** Taskwarrior (when local online)
2. **Fallback:** TickTick (when Taskwarrior unavailable)

#### Environment Variables (Node.js)

```bash
FIRE_GCAL_EMBED_URL=...           # Embedded calendar URL
FIRE_TASK_TAGS_ALL=fire,production,hit  # Default tags
FIRE_TASK_DATE_FIELDS=scheduled,due     # Date fields to check
```

#### Notes (Node.js)

**Taskwarrior Primary:**
- `/api/fire/day` and `/api/fire/week` use Taskwarrior as primary source
- Filters by: `+fire +production +hit` tags
- Date fields: `scheduled` or `due`

**TickTick Fallback:**
- Requires Taskwarrior hooks to push tasks with `+fire` tags
- Only used when Taskwarrior unavailable

---

### Python Bot Implementation

#### Fire Map Bot

**Location:**
- `python-firemap-bot/firemap_bot.py`

**Purpose:**
- Sends daily/weekly Fire Map snapshots from Taskwarrior to Telegram

**Commands (via Router):**
- `/fire` - Daily snapshot
- `/fireweek` - Weekly snapshot

**Router Integration:**
- `router/extensions/firemap_commands.py`
- Triggers Python bot locally when router receives commands

**Data Source:**
- Taskwarrior (reads tasks with `+fire` tags)
- Formats as readable Telegram message
- Sends to configured chat

---

### CLI Integration

#### Fire Output (Terminal)

Fire tasks come from Taskwarrior (`+fire`). Terminal output uses the same engine as Telegram (`python-firemap-bot/firemap.py`).

```bash
firemap print daily
firemap print weekly
```

Wrapper (optional):
```bash
firectl print daily
firectl print weekly
```

#### Fire Map Sync (Legacy)

**Command:**
```bash
firemap sync (legacy)
```

**Script:**
- `scripts/utils/fire-to-tasks.sh`

**What It Does:**
1. Reads Fire Map markdown files from Vault
2. Parses weekly strikes and daily tasks
3. Converts to Taskwarrior tasks
4. Tags: `+fire +hit +production`
5. Sets `scheduled` or `due` dates

**Taskwarrior Hook Flow:**
```bash
Legacy: Fire Map markdown → firemap sync → Taskwarrior tasks
  ↓
on-add.alphaos.py hook → TickTick push (if configured)
  ↓
TickTick ICS feed → Google Calendar (subscribed)
```

---

### TickTick Integration

**Purpose:**
- Mobile access to Fire Map tasks
- Always-on sync across devices

**Flow:**
1. Fire Map created (GAS or local markdown)
2. Synced to Taskwarrior via `firemap sync`
3. Taskwarrior hooks push to TickTick
4. TickTick provides ICS feed
5. Google Calendar subscribes to ICS

**Tags Required:**
- `+fire +production +hit` (for Taskwarrior hook to trigger)

**TickTick Properties:**
- `TICKTICK_TOKEN` (API access)
- `TICKTICK_PROJECT_ID` (default project for Fire tasks)

---

### Google Calendar Integration

**Purpose:**
- Visual weekly view
- Embedded in Fire Centre UI (GAS)
- Optional (personal) calendar view; not used as `/fire` data source

**Setup Options:**

If you want a calendar view, keep it separate from the Fire Bot:
- Use `FIRE_GCAL_EMBED_URL` to embed a calendar in the UI (optional)
- Any ICS subscriptions are fine for your own calendar, but not used by `/fire`

**Embed URL:**
- `FIRE_GCAL_EMBED_URL` - iframe embed for Fire Centre UI

**Note:** Calendar is **UI-only** for GAS Fire Centre. Not used as data source for saving Fire Maps.

---

### UX Focus (Current Implementation)

**Primary Goal:**
Show what already exists BEFORE creating anything new.

**What Fire Centre Shows:**

1. **Current Week Fire Map Entries:**
   - Weekly strikes
   - Daily ignition tasks

2. **Scheduled Tasks (Calendar View):**
   - Timing visible at glance
   - Visual weekly overview

3. **TickTick Tasks:**
   - Tasks pushed from Fire tags
   - Mobile sync status

4. **Daily Consolidated Task List:**
   - Single view of today's actions
   - No switching between tools

5. **7-Day Consolidated View:**
   - Upcoming week at glance
   - Week-ahead planning

6. **Journal-Friendly Inputs:**
   - Backfill what you did yesterday
   - Fire Map markdown = Obsidian journal log
   - Used for Profit/Review phase

---

## Testing

### Quick Smoke Test (GAS)

```javascript
// 1. Create Fire Map entry
saveFireEntry({
  week: "2026-01-10",
  domain: "Business",
  strikes: ["Strike 1", "Strike 2", "Strike 3", "Strike 4"],
  dailyTasks: {
    monday: "Task 1",
    tuesday: "Task 2"
    // ...
  }
})

// 2. Verify Drive
// Check Alpha_Game/Fire/KW02 2026 for new markdown

// 3. Check TickTick tasks
getDailyTasks()  // Should show today's tasks
getWeeklyTasks()  // Should show week's tasks
```

### Quick Smoke Test (Node.js)

```bash
# 1. Get daily Fire Map
curl http://127.0.0.1:8799/api/fire/day

# 2. Get weekly Fire Map
curl http://127.0.0.1:8799/api/fire/week

# 3. Verify Taskwarrior
task +fire list

# 4. Check scheduled for today
task +fire scheduled:today list
```

### Quick Smoke Test (CLI)

```bash
# 1. Create Fire Map markdown
vim ~/AlphaOS-Vault/Game/Fire/FIRE_MAP_Business_KW02_2026.md

# 2. Sync to Taskwarrior
firemap sync

# 3. Verify tasks created
task +fire +hit list

# 4. Check TickTick push (via hooks)
# Tasks should appear in TickTick if hooks configured
```

### Quick Smoke Test (Telegram)

```bash
# Via Router Bot (local)
/fire        # Daily snapshot
/fireweek    # Weekly snapshot

# Via Fire Bot (GAS, always-on)
/fire        # Daily from Drive task_export snapshot
/fireweek    # Weekly from Drive task_export snapshot
```

---

## Setup Checklist

### GAS Setup (Run Once)

**Script Properties to Set:**

```javascript
// Fire Bot (Telegram polling, always-on)
FIRE_BOT_TOKEN = "telegram_bot_token"

// Task export snapshot (Drive)
AOS_TASK_EXPORT_FILE_ID = "drive_file_id_for_task_export.json"

// Optional UI-only embed
FIRE_GCAL_EMBED_URL = "https://calendar.google.com/..."
```

### Node.js Setup

**Environment Variables (.env):**

```bash
FIRE_GCAL_EMBED_URL=https://calendar.google.com/...
FIRE_TASK_TAGS_ALL=fire,production,hit
FIRE_TASK_DATE_FIELDS=scheduled,due
```

### CLI Setup

**Install Fire Map Sync:**

```bash
# Ensure fire-to-tasks.sh is executable
chmod +x ~/aos-hub/scripts/utils/fire-to-tasks.sh

# Add to PATH (if not already)
export PATH="$PATH:~/aos-hub/scripts/utils"
```

### Taskwarrior Hooks Setup

**Ensure hooks installed:**

```bash
ls ~/.task/hooks/on-add.alphaos.py
ls ~/.task/hooks/on-exit.alphaos.py

# Hooks should push tasks with +fire tags to TickTick
```

---

## Related Documentation

- [GAME_CENTRE.md](GAME_CENTRE.md) - Complete GAME system (Frame/Freedom/Focus/Fire)
- [gas/README.md](../gas/README.md) - GAS HQ full docs
- [index-node/README.md](../index-node/README.md) - Node.js server docs
- [python-firemap-bot/README.md](../python-firemap-bot/README.md) - Fire Map Bot
- [AlphaOS-THE-GAME.md](~/Dokumente/AlphaOs-Vault/ALPHA_OS/AlphaOS-THE-GAME.md) - Elliott Hulse Game philosophy

---

**Last Updated:** 2026-01-10
**AlphaOS Philosophy:** Elliott Hulse Blueprint (Chapter 35 - Fire)
**Implementation Status:** ✅ Multi-Platform (GAS + Node.js + Python + CLI)
