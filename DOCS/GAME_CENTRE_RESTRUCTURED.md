# Game Centre Documentation

**THE GAME** - Fact Maps System (Frame → Freedom → Focus → Fire → Tent)

**Last Updated:** 2026-01-10

---

## AlphaOS Philosophy: What MUST Be

> "The Alpha Game, through the Fact Mapping System, keeps your head in the clouds with big dreams while your feet stay firmly planted on the ground, focused on action and results." — Elliott Hulse

### Purpose

**Strategic Navigation System** - From current reality (Frame) to weekly execution (Fire) through cascading maps.

**The Cascade:**

```
FRAME (Where am I? - Current reality)
  ↓
IPW (10-year Ideal Parallel World)
  ↓
FREEDOM (Annual vision - How do I get there?)
  ↓
FOCUS (Monthly mission - What to do to stay on course?)
  ↓
FIRE (Weekly war - Specific tasks RIGHT NOW)
  ↓
DAILY GAME (Daily execution)
  ↓
TENT (Weekly review - Return and report)
```

**Critical:** Each layer FEEDS the next. Without Frame, no Freedom. Without Freedom, no Focus. Without Focus, no Fire.

---

## The Complete Flow

### Step 1: FRAME (Current Reality)

**MUST Answer:**
1. Where am I now?
2. How did I get here?
3. How do I feel about where I am?
4. What is working?
5. What is not working?

**Per Domain:** Body, Being, Balance, Business (4 Frame Maps)

**Outcome:** Clear, honest snapshot of current reality

---

### Step 2: IPW (Ideal Parallel World Vision)

**MUST Ask:**
> "If anything were possible, what would I want my life to look like in 10 years from now?"

**Per Domain:** Envision the impossible
- **Body:** Unattainable physique and health
- **Being:** Spiritual connection beyond current understanding
- **Balance:** Deeper, harmonious relationships
- **Business:** Financial successes that seem like fantasies

**Outcome:** 10-year IPW defined for each domain

---

### Step 3: FREEDOM (Annual Map)

**From Frame to Freedom:**
- Frame = who you are NOW
- Freedom = who you WILL BECOME

**MUST Define:**
- Annual vision for each domain
- Bridges between current reality and IPW
- "God supports truth" - align with divine vision

**Outcome:** Annual Freedom Map (year-long vision)

---

### Step 4: FOCUS (Monthly Mission)

**Break Down Freedom into Monthly Steps:**

**MUST Define:**
1. **Habits** - Daily actions (backbone of progress)
2. **Routines** - Predictable patterns (keep on track)
3. **Additions** - New tools, skills, allies
4. **Eliminations** - Things to let go

**Per Domain:** Monthly mission for Body, Being, Balance, Business

**Outcome:** Monthly Focus Map (actionable 30-day plan)

---

### Step 5: FIRE (Weekly War)

**Break Down Focus into Weekly Strikes:**

**MUST Define:**
- 4 strikes per domain (16 total per week)
- Daily ignition (what happens each day)
- Simple, clear, actionable tasks

**Philosophy:**
- 52 Weekly Wars = 1 victorious year
- Small, deliberate, consistent actions
- No grand gestures needed

**Outcome:** Weekly Fire Map (7-day battle plan)

---

### Step 6: DAILY GAME (Daily Execution)

**Today's Actions:**
- Derived from Fire Map
- Consolidated task list (single view)
- Calendar/scheduled view
- Taskwarrior + TickTick integration

**Outcome:** Clear list of what needs to happen TODAY

---

### Step 7: TENT (Weekly Review)

**General's Tent - Return and Report:**

**MUST Complete:**
1. **Return and Report** - What was completed?
2. **Lessons Learned** - What worked? What didn't?
3. **Course Correction** - What needs to change?
4. **New Targets** - What's next week's Fire Map?

**Outcome:** Updated Focus Map, Updated Fire Map, Weekly Review Log

---

## Implementation: What IS

### Multi-Platform Status

| Component | GAS | Node.js | Python/CLI |
|-----------|-----|---------|------------|
| **Frame** | ✅ Active | ⏳ Missing | ⏳ Missing |
| **Freedom** | ✅ Active | ⏳ Missing | ⏳ Missing |
| **Focus** | ✅ Active | ⏳ Missing | ⏳ Missing |
| **Fire** | ✅ Active | ✅ Active | ✅ Active (Fire Map Bot) |
| **Tent** | ✅ Active (auto) | ⏳ Missing | ⏳ Missing |

---

### GAS Implementation

#### Frame Centre

**Entry:** `gas/Game_Frame_Index.html`
**Backend:** `gas/game_frame.gs`
**Storage:** Drive `Alpha_Game/Frame/Frames`
**API:** `saveFrameEntry(domain, answers)`, `getRecentFrames(limit)`

#### Freedom Centre

**Entry:** `gas/Game_Freedom_Index.html`
**Backend:** `gas/game_freedom.gs`
**Storage:** Drive `Alpha_Game/Freedom/10Year_IPW`, `Annual`
**API:** `saveFreedomEntry(domain, vision, period, type)`

#### Focus Centre

**Entry:** `gas/Game_Focus_Centre.html`
**Backend:** `gas/game_focus.gs`
**Storage:** Drive `Alpha_Game/Alpha_Focus` (Current, Q1-Q4)
**API:** `saveFocusEntry(domain, mission, month, type)`

#### Fire Centre

**Entry:** `gas/Game_Fire_Index.html`
**Backend:** `gas/game_fire.gs`
**Storage:** Drive `Alpha_Game/Fire/KW<WW> <YYYY>`
**API:** `saveFireEntry(data)`, `getDailyTasks()`, `getWeeklyTasks()`
**Integration:** TickTick tasks, GCal embed

#### Tent Centre

**Entry:** Automatic (Sunday 20:00 trigger)
**Backend:** `gas/tent.gs`
**Storage:** Drive `Alpha_Tent/Weekly_Reviews/tent_week_summary_YYYY_WW.json`
**Setup:** `tent_setupWeeklyReviewTrigger()` (run once)
**Automation:** Collects Core4 totals, War Stack stats, Voice Session count, sends Telegram summary

---

### Node.js Implementation

**Entry:** `http://127.0.0.1:8799/game` (Main Game Hub)
**Backend:** `index-node/server.js`
**Storage:** Vault `~/AlphaOS-Vault/Game/`

#### Game Hub

**Entry:** `http://127.0.0.1:8799/game`

**Sub-centres:**
- Frame: `/game/frame`
- Freedom: `/game/freedom`
- Focus: `/game/focus`
- Fire: `/game/fire`
- Tent: `/game/tent`

---

#### Frame Centre (Node.js)

**Entry:** `http://127.0.0.1:8799/game/frame`

**Storage:**
- Vault: `~/AlphaOS-Vault/Game/Frame` (local)

**API:**
- Frame data exported via `GET /api/game/export` (shared Game export)

**Features:**
- Local Frame Map creation
- 5 required questions (Where am I? How did I get here? etc.)
- Export to Vault markdown

---

#### Freedom Centre (Node.js)

**Entry:** `http://127.0.0.1:8799/game/freedom`

**Storage:**
- Vault: `~/AlphaOS-Vault/Game/Freedom` (local)

**API:**
- Export via `GET /api/game/export` (shared Game export)

**Features:**
- IPW (Ideal Parallel World) vision creation
- Annual Freedom Map
- Export to Vault markdown

---

#### Focus Centre (Node.js)

**Entry:** `http://127.0.0.1:8799/game/focus`

**Storage:**
- Vault: `~/AlphaOS-Vault/Game/Focus` (local)

**API:**
- Export via `GET /api/game/export` (shared Game export)

**Features:**
- Monthly mission planning
- Habits, Routines, Additions, Eliminations tracking
- Export to Vault markdown

---

#### Fire Centre (Node.js)

**Entry:** `http://127.0.0.1:8799/game/fire`
**Backend:** `index-node/server.js`
**Storage:** Vault `~/AlphaOS-Vault/Game/Fire/`

**API:**
- `GET /api/fire/day` - Today's Fire Map (Taskwarrior primary, TickTick fallback)
- `GET /api/fire/week` - Current week Fire Map
- Aliases: `/fired`, `/firew`

**Environment:**
```bash
FIRE_GCAL_EMBED_URL=...
FIRE_TASK_TAGS_ALL=fire,production,hit
FIRE_TASK_DATE_FIELDS=scheduled,due
```

**Features:**
- Taskwarrior integration (primary data source)
- TickTick fallback (when TW offline)
- GCal embed support
- Weekly War view (4 strikes per domain)

---

#### General's Tent (Node.js)

**Entry:** `http://127.0.0.1:8799/game/tent`

**Storage:**
- Vault: `~/AlphaOS-Vault/Game/Tent` (local)

**API:**
```bash
POST /api/generals/report              # Submit weekly review
GET /api/generals/latest?type=frame|freedom|focus|fire|voice  # Get latest Map
```

**Features:**
- Weekly review submission
- Latest Map retrieval (cross-centre)
- Return and report workflow
- Course correction tracking

---

### Python/CLI Implementation

#### Fire Map Bot (Telegram)

**Location:** `python-firemap-bot/firemap_bot.py`
**Commands:** `/fire` (daily), `/fireweek` (weekly)
**Data Source:** Taskwarrior (`+fire` tasks)
**Engine:** `python-firemap-bot/firemap.py` (prints Markdown-formatted text; overdue separate; grouped per project)

#### Fire Map Sync (CLI)

**Command:** `firemap sync`
**Script:** `scripts/utils/fire-to-tasks.sh`
**Flow (legacy):** Fire Map markdown → Taskwarrior tasks → TickTick (via hooks) → GCal (via ICS)

#### Fire Output (Terminal)

**Commands:**
- `firemap print daily|weekly` (same output as `/fire`)
- `firectl print daily|weekly` (wrapper; can also install systemd/taskrc helpers)

---

### Fire Bot (GAS Telegram - Always-On)

**Token:** `FIRE_BOT_TOKEN` (separate bot)
**Commands:** `/fire`, `/fireweek`
**Mode:** Polling (works when local offline)
**Data Source:** GCal events (via `FIRE_GCAL_CALENDAR_ID`) or ICS fallback

---

## Data Flow (Complete System)

```
┌─────────────────────────────────────────────────────────────┐
│ FRAME (Annual Deep Dive)                                    │
│ - Answer 5 questions per domain                            │
│ - GAS: saveFrameEntry() → Drive Alpha_Game/Frame           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ IPW (10-Year Vision)                                        │
│ - Dream the impossible per domain                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ FREEDOM (Annual Vision)                                     │
│ - Bridge between Frame and IPW                             │
│ - GAS: saveFreedomEntry() → Drive Alpha_Game/Freedom       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ FOCUS (Monthly Mission)                                     │
│ - Habits, Routines, Additions, Eliminations                │
│ - GAS: saveFocusEntry() → Drive Alpha_Game/Alpha_Focus     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ FIRE (Weekly War)                                           │
│ - 4 strikes per domain, daily ignition                     │
│ - GAS: saveFireEntry() → Drive Alpha_Game/Fire             │
│ - Node: /api/fire/day, /api/fire/week                      │
│ - CLI: firemap sync → Taskwarrior                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ TASKWARRIOR (Task Execution)                                │
│ - Tags: +fire +hit +production                             │
│ - Hooks push to TickTick                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ DAILY GAME (Today's Actions)                                │
│ - Consolidated task list                                   │
│ - Taskwarrior + TickTick + GCal                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ TENT (Weekly Review - Sunday 20:00)                        │
│ - GAS: tent_setupWeeklyReviewTrigger()                     │
│ - Collects: Core4 totals, War Stack stats, Voice count    │
│ - Sends Telegram summary                                   │
│ - Updates Focus/Fire Maps for next week                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Testing

### Quick Smoke Test (Complete Flow)

```bash
# 1. Frame (Annual)
# GAS: saveFrameEntry("Body", {...5 questions...})

# 2. Freedom (Annual)
# GAS: saveFreedomEntry("Body", "10-year IPW vision...", "annual", "ipw")

# 3. Focus (Monthly)
# GAS: saveFocusEntry("Body", "Monthly mission...", "January", "habits")

# 4. Fire (Weekly)
# GAS: saveFireEntry({week: "2026-01-10", domain: "Body", strikes: [...]})
# OR CLI: vim ~/AlphaOS-Vault/Game/Fire/FIRE_MAP_Body_KW02_2026.md
#         firemap sync

# 5. Daily Game
# Node: curl http://127.0.0.1:8799/api/fire/day
# Telegram: /fire

# 6. Tent (Weekly - Automatic)
# GAS: tent_testWeeklyReview()  # Manual trigger for testing
```

---

## Setup Checklist

### GAS Setup (Run Once)

```javascript
// Frame, Freedom, Focus (UserProperties auto-set on first use)

// Fire Centre
TICKTICK_TOKEN = "..."
TICKTICK_PROJECT_ID = "..."
FIRE_GCAL_CALENDAR_ID = "..."
FIRE_GCAL_EMBED_URL = "..."
FIRE_BOT_TOKEN = "..."

// Tent Weekly Review
tent_setupWeeklyReviewTrigger()  // Sunday 20:00
```

### Node.js Setup

```bash
# .env
FIRE_GCAL_EMBED_URL=...
FIRE_TASK_TAGS_ALL=fire,production,hit
FIRE_TASK_DATE_FIELDS=scheduled,due
```

### CLI Setup

```bash
# Fire Map sync
chmod +x ~/aos-hub/scripts/utils/fire-to-tasks.sh
```

---

## Related Documentation

- [DOOR_CENTRE_RESTRUCTURED.md](DOOR_CENTRE_RESTRUCTURED.md) - Weekly Tactics (4P Flow)
- [VOICE_CENTRE_RESTRUCTURED.md](VOICE_CENTRE_RESTRUCTURED.md) - Mental Mastery
- [CORE4_CENTRE_RESTRUCTURED.md](CORE4_CENTRE_RESTRUCTURED.md) - Daily Habits
- [gas/README.md](../gas/README.md) - GAS HQ full docs
- [index-node/README.md](../index-node/README.md) - Node.js server docs
- [AlphaOS-THE-GAME.md](~/Dokumente/AlphaOs-Vault/ALPHA_OS/AlphaOS-THE-GAME.md) - Elliott Hulse Blueprint (Chapters 32-42)

---

**Last Updated:** 2026-01-10
**AlphaOS Philosophy:** Elliott Hulse Blueprints (Chapters 32-42 - THE GAME)
**Implementation Status:** ✅ GAS (Frame/Freedom/Focus/Fire/Tent) | ⏳ Node.js (Fire only) | ✅ CLI (Fire sync + Fire Map Bot)
