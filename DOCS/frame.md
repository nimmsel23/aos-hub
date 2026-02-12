# Frame Centre Documentation

**Frame Map** - Current Reality Assessment (Part of THE GAME)

**Last Updated:** 2026-01-10

---

## Table of Contents

1. [αOS Philosophy: What MUST Be](#alphaos-philosophy-what-must-be)
2. [Implementation: What IS](#implementation-what-is)
3. [Testing](#testing)

---

## αOS Philosophy: What MUST Be

> "The Frame Map is the foundation of the Alpha OS Journey. It's where all creation begins." — Elliott Hulse

### Purpose

**Establish Current Reality** - Know where you are RIGHT NOW before charting course to where you want to be.

**Position in THE GAME Hierarchy:**

```
FRAME (Where am I? - Current reality) ← YOU ARE HERE
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
```

**Critical:** Frame Map is your **starting line, not your finish**. Understanding where you are is the first step to charting the course to where you want to be.

---

## What MUST Happen

### 1. UNDERSTANDING THE FRAME MAP

**Definition:**
- Frame Map = moment of reflection
- Conscious acknowledgment of where you stand in life RIGHT NOW
- NOT just an idea, but a PRACTICE

**The Core Questions (MUST Answer):**

1. **"Where am I now?"**
2. **"How did I get here?"**
3. **"How do I feel about where I am?"**
4. **"What is working about where I am now?"**
5. **"What is not working about where I am?"**

**Why These Questions Matter:**
- By answering these, you not only place yourself on the map of life
- You gain clarity about the conditions and circumstances that define your present
- You understand BOTH what works AND what doesn't work

---

### 2. THE POWER OF THE FRAME MAP

**The Problem:**
- World overflowing with information
- Constant pressure to move forward
- Easy to get lost in chaos of our lives
- We end up **reacting instead of acting**
- Following instead of leading
- Drifting instead of steering

**The Solution (Frame Map):**
- Breaks the reactive cycle
- Forces you to STOP
- Take a look around
- Truly SEE where you are

**What "Working" Means:**
- Recognizing parts of current situation that align with your goals and values
- Identifying strengths and resources you have

**What "Not Working" Means:**
- Facing the barriers and challenges that hold you back
- Acknowledging obstacles honestly

**Critical Rule:** This process applies to ALL FOUR DOMAINS of the Core.

---

### 3. THE FOUR DOMAINS OF THE FRAME MAP

**MUST Evaluate Each Domain Separately AND As a Whole:**

| Domain | Focus Areas | Questions |
|--------|-------------|-----------|
| **BODY** | Fitness + Fuel | Health, vitality, physical well-being |
| **BEING** | Meditation + Memoirs | Spiritual essence, connection to God |
| **BALANCE** | Partner + Posterity | Relationships—family, partners, children, friends |
| **BUSINESS** | Discover + Declare | Material world—job, businesses, money |

**Each domain has its own Frame Map.**

**Why All Four?**
- Life is mix of interwoven threads across four domains
- To truly understand where you are, you need to evaluate yourself in each one
- Both separately (domain-specific insight) and as a whole (holistic view)

---

### 4. THE TOOL: FACT MAPS

**Frame Map Sets the Stage:**

The Frame Map is the **foundation** that enables the entire FACT MAPS system:

```
FRAME (Facts of current reality)
  ↓
Sets the stage for...
  ↓
FREEDOM (Annual map - unlock ultimate desires)
  ↓
Informs...
  ↓
FOCUS (Monthly maps - what's needed short-term to achieve long-term freedom)
  ↓
Drives...
  ↓
FIRE (Weekly map - daily action steps, making impossible possible)
```

**Without Frame:**
- No clarity on starting point
- No compass for navigation
- Like trying to navigate vast city without knowing where you are
- You'd be lost

**With Frame:**
- Clear picture of where you stand RIGHT NOW
- Foundation for all future mapping
- Ensures first step is in right direction

---

### 5. THE FRAME IS YOUR STARTING LINE, NOT YOUR FINISH

**The Journey:**
1. **Frame** - Where am I? (starting line)
2. **Freedom** - Where do I want to be? (finish line / IPW)
3. **Focus** - What's my monthly plan? (milestones)
4. **Fire** - What's this week's action? (daily steps)

**Every Great Journey:**
- Begins with single step
- Frame ensures that step is in RIGHT direction

**What Frame Enables:**
- Path from Frame to Freedom
- From Freedom to Focus
- From Focus to Fire
- Together, these maps guide you through strategies needed to win the impossible game of Dominion in life

---

## Required Components

### What Frame Map MUST Include

**Per Domain (Body/Being/Balance/Business):**

1. **Current State Assessment:**
   - Where am I now in this domain?
   - Specific facts, not vague feelings

2. **Journey Analysis:**
   - How did I get here?
   - What decisions/actions/habits led to this point?

3. **Emotional Check:**
   - How do I feel about where I am?
   - Honest acknowledgment of satisfaction or dissatisfaction

4. **What's Working:**
   - Strengths in this domain
   - Alignments with goals/values
   - Resources available

5. **What's Not Working:**
   - Barriers and challenges
   - Misalignments with goals/values
   - Gaps and deficiencies

**Frequency:**
- Annual deep review (minimum)
- Can be done more frequently (quarterly, when major shifts occur)

**Outcome:**
- Clear, honest snapshot of current reality
- Foundation for Freedom Map creation
- Truth alignment (critical for divine vision)

---

## Implementation: What IS

### GAS Implementation

#### Entry Points

**UI:**
- `gas/Game_Frame_Index.html` (inline in HQ)

**Backend:**
- `gas/game_frame.gs`

#### Storage (GAS)

**Drive:**
- Root: `Alpha_Game/Frame`
- Subfolder: `Frames`

**Logsheet:**
- `Alpha_Frame_Logsheet`

#### API Functions (GAS)

**Frame Map:**
- `saveFrameEntry(domain, answers)` - Save Frame Map for domain
- `getRecentFrames(limit)` - Get recent Frame Maps

**Parameters:**
- `domain` - One of: Body, Being, Balance, Business
- `answers` - Object with 5 core questions answered

#### Script Properties (GAS)

**User-Specific:**
- `FRAME_DRIVE_FOLDER_ID` - User's Frame folder (UserProperties)
- `FRAME_LOG_SHEET_ID` - User's Frame log sheet (UserProperties)

**Note:** Frame uses **UserProperties** (per-user storage), not project-level.

---

### Node.js Implementation

**Status:** ⏳ Missing

**Planned:**
- Local Frame Map UI
- Vault storage: `~/AlphaOS-Vault/Game/Frame/`
- API endpoints: `/api/frame/save`, `/api/frame/list`

---

### CLI Implementation

**Status:** ⏳ Missing

**Planned:**
- `frame` command - Interactive Frame Map session
- Saves to Vault markdown
- Can trigger Freedom Map update

---

## Testing

### Quick Smoke Test (GAS)

```javascript
// 1. Save Frame Map for Body domain
saveFrameEntry("Body", {
  where_now: "180 lbs, running 3x/week",
  how_got_here: "6 months of consistent training",
  how_feel: "Satisfied but want more strength",
  what_works: "Running habit is solid",
  what_not_works: "No strength training yet"
})

// 2. Verify Drive
// Check Alpha_Game/Frame/Frames for new markdown

// 3. Get recent Frame Maps
getRecentFrames(5)  // Should show last 5 Frame Maps
```

---

## Related Documentation

- [freedom.md](freedom.md) - Next step after Frame
- [game.md](game.md) - Complete GAME system overview
- [gas/README.md](../gas/README.md) - GAS HQ full docs
- [AlphaOS-THE-GAME.md](~/Dokumente/AlphaOs-Vault/ALPHA_OS/AlphaOS-THE-GAME.md) - Elliott Hulse Game philosophy (Chapter 32)

---

**Last Updated:** 2026-01-10
**αOS Philosophy:** Elliott Hulse Blueprint (Chapter 32 - Frame)
**Implementation Status:** ✅ GAS Active | ⏳ Node.js Missing | ⏳ CLI Missing
