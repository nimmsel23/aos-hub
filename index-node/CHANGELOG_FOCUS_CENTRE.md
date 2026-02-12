# CHANGELOG - Focus Centre

All notable changes to the Focus Centre (Index Node & GAS) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.0.0] - 2026-01-18

### Added - YAML Front Matter

#### Locked Focus Maps now include YAML Front Matter

**Both Index Node & GAS implementations** now generate markdown files with standardized YAML front matter:

```yaml
---
domain: BODY
month: December 2025
phase: current
date: 18.01.2026
created: 2026-01-18T14:23:45.123Z
sessionId: FOC-20260118-1234  # GAS only
type: focus-map
status: locked
tags:
  - alphaos
  - focus
  - body
  - current
---
```

**Benefits:**
- **Obsidian compatible:** Works with Dataview queries, tags, filters
- **Machine-readable:** Structured metadata for automation
- **Query-able:** Filter maps by domain, phase, date ranges
- **Future-proof:** Enables AI processing, analytics, reporting

**Markdown Structure Change:**
- **Old format:** `**Habits**\nContent`
- **New format:** `## HABITS\nContent`
- **Backwards compatible:** Load function handles both formats

**Example Generated File:**
```markdown
---
domain: BODY
month: December 2025
phase: current
date: 18.01.2026
created: 2026-01-18T14:23:45.123Z
type: focus-map
status: locked
tags:
  - alphaos
  - focus
  - body
  - current
---

# FOCUS MAP – BODY
**Month:** December 2025
**Phase:** current
**Date:** 18.01.2026

---

## HABITS
Training 5x/Woche
Morning Routine 6:00

## ROUTINES
6:00 - 7:00 Morning Block
18:00 - 19:00 Training

## ADDITIONS
Cold Plunge 3x/Woche
Meditation 10min täglich

## ELIMINATIONS
Zucker nach 18:00
Social Media vor 9:00
```

**Implementation:**
- Index Node: `public/game/focus.html:610-646`
- GAS: `gas/game_focus.gs:123-161`

**Parsing:**
- Regex updated to handle both formats
- Backwards compatibility maintained
- Index Node: `public/game/focus.html:769-779`
- GAS: `gas/Game_Focus_Script.html:176-186`

**Usage Examples (Obsidian Dataview):**

```dataview
TABLE domain, month, phase, date
FROM "Game/Focus"
WHERE type = "focus-map"
SORT date DESC
```

```dataview
LIST
FROM "Game/Focus"
WHERE domain = "BODY" AND phase = "current"
```

```dataview
TABLE domain, habits, routines
FROM "Game/Focus"
WHERE contains(tags, "current")
SORT domain ASC
```

**Usage Examples (Command Line):**

```bash
# List all BODY focus maps
grep -l "domain: BODY" ~/AlphaOS-Vault/Game/Focus/*.md

# Extract all habits from BODY maps
awk '/^domain: BODY/,/^## HABITS/ {if (/^## HABITS/) p=1; next} p && /^## / {exit} p' ~/AlphaOS-Vault/Game/Focus/*.md

# Find Focus Maps from December 2025
grep -l "month: December 2025" ~/AlphaOS-Vault/Game/Focus/*.md
```

### Added - Cascade Integration (Freedom → Focus → Fire)

#### Fire Map Export with Focus References

**Fire Maps now reference their governing Focus Maps** through YAML front matter, completing the cascade from strategic planning (Freedom) → monthly execution (Focus) → weekly war (Fire).

**New Fire Map Export Button** (`public/game/fire.html:417-424`):
```html
<button onclick="exportWeekToMarkdown()">
  🔥 LOCK FIRE MAP (Week + All Domains)
</button>
```

**Generated Fire Map YAML Structure:**
```yaml
---
week: 2026-W03
year: 2026
month: January 2026
date: 18.01.2026
created: 2026-01-18T15:42:30.123Z
type: fire-map
status: locked
focus_maps:
  body: BODY_focus_January_2026
  being: BEING_focus_January_2026
  balance: BALANCE_focus_January_2026
  business: BUSINESS_focus_January_2026
tags:
  - alphaos
  - fire
  - weekly
  - 2026-W03
---
```

**Key Feature - `focus_maps:` Object:**
- References all 4 domain Focus Maps by filename
- Enables bidirectional queries (Fire → Focus, Focus → Fire)
- Constructed dynamically from current month
- Format: `{domain}_focus_{Month}_{Year}`

**Example Fire Map File:**
```markdown
---
week: 2026-W03
type: fire-map
focus_maps:
  body: BODY_focus_January_2026
  being: BEING_focus_January_2026
  balance: BALANCE_focus_January_2026
  business: BUSINESS_focus_January_2026
tags:
  - alphaos
  - fire
  - weekly
  - 2026-W03
---

# 🔥 FIRE MAP - Week 2026-W03
**Period:** 13.01.2026 - 19.01.2026
**Date:** 18.01.2026

---

## BODY

1. Training 5x diese Woche
2. Morning Routine täglich 6:00
3. Cold Plunge 3x
4. 8h Schlaf pro Nacht

## BEING

1. Meditation 10min täglich
2. Journaling morgens
3. Chapter 12 lesen
4. VOICE Session Sonntag

## BALANCE

1. Date Night Freitag
2. 2h Quality Time täglich
3. Call Familie
4. Sanctuary aufräumen

## BUSINESS

1. Vitaltrainer Modul 3
2. FADARO Blog Post
3. Twitter Thread
4. Client Session vorbereiten
```

**Implementation:** `public/game/fire.html:512-590`

**Function: `exportWeekToMarkdown()`**
- Collects all strikes from all 4 domains
- Generates YAML with `focus_maps:` references
- Constructs Focus Map filenames from current month
- Posts to `/api/game/export` endpoint
- Saves to `~/AlphaOS-Vault/Game/Fire/`

#### Freedom Map YAML Front Matter

**Freedom Maps now include YAML front matter** for cascade integration and Obsidian compatibility.

**Generated Freedom Map YAML Structure:**
```yaml
---
domain: BODY
horizon: 10Year
period: 2026-2036
date: 18.01.2026
created: 2026-01-18T15:42:30.123Z
type: freedom-map
status: manifested
tags:
  - alphaos
  - freedom
  - body
  - 10year
---
```

**Implementation:** `public/game/freedom.html:329-346`

**Key Fields:**
- `domain`: BODY | BEING | BALANCE | BUSINESS
- `horizon`: 10Year | 5Year | 3Year | 1Year
- `period`: Calculated from current date + horizon
- `type`: freedom-map
- `status`: manifested (vs locked for Focus/Fire)

**Example Freedom Map File:**
```markdown
---
domain: BODY
horizon: 10Year
period: 2026-2036
date: 18.01.2026
created: 2026-01-18T15:42:30.123Z
type: freedom-map
status: manifested
tags:
  - alphaos
  - freedom
  - body
  - 10year
---

# FREEDOM MAP – BODY
**Domain:** BODY
**Horizon:** 10Year (2026-2036)
**Date:** 18.01.2026

---

## VISION

In 10 Jahren bin ich ein vollständig vitaler Mann mit vollständiger Körperbeherrschung...

## MILESTONES

- Jahr 1-2: Foundation (Genetic Risk Management, Training Consistency)
- Jahr 3-5: Mastery (Advanced Movement, Peak Performance)
- Jahr 6-10: Integration (Teaching, Embodiment, Legacy)

## DOMINO DOORS

1. Vitaltrainer Ausbildung → Credibility
2. Training Consistency → Habit Stack
3. Lower Dantian Practice → Grounding
```

#### Cascade Architecture

**Three-Level Hierarchy:**

```
FREEDOM (Annual/Multi-Year Vision)
    ↓ Defines strategic direction
FOCUS (Monthly Mission)
    ↓ Breaks down into executable phases
FIRE (Weekly War)
    ↓ Daily strikes and execution
```

**Data Flow:**
- Freedom Map → defines what Focus Maps should achieve
- Focus Map → defines monthly habits/routines for Fire execution
- Fire Map → references Focus Maps via YAML `focus_maps:` object

**Query Examples (Obsidian Dataview):**

```dataview
# Find all Fire Maps for a specific Focus Map
TABLE week, tags
FROM "Game/Fire"
WHERE contains(focus_maps.body, "BODY_focus_January_2026")
SORT week DESC
```

```dataview
# Show cascade for BODY domain
TABLE type, month OR week OR horizon as "Period"
FROM "Game"
WHERE domain = "BODY" AND (type = "freedom-map" OR type = "focus-map" OR type = "fire-map")
SORT type ASC, date DESC
```

```dataview
# Check if Focus Map has associated Fire Maps
TABLE
  length(file.inlinks) as "Fire Maps Using This",
  month,
  phase
FROM "Game/Focus"
WHERE type = "focus-map"
SORT date DESC
```

**Command Line Cascade Queries:**

```bash
# Find which Fire Maps use a specific Focus Map
grep -l "BODY_focus_January_2026" ~/AlphaOS-Vault/Game/Fire/*.md

# Extract focus_maps object from Fire Map
awk '/^focus_maps:/,/^[a-z]/ {print}' ~/AlphaOS-Vault/Game/Fire/fire_2026-W03.md

# List all Fire Maps with their Focus references
grep -H "focus_maps:" ~/AlphaOS-Vault/Game/Fire/*.md
```

**Benefits:**
- **Bidirectional navigation:** Fire ↔ Focus ↔ Freedom
- **Execution validation:** Check if Fire strikes align with Focus mission
- **Progress tracking:** Count Fire Maps per Focus Map (execution frequency)
- **Cascade integrity:** Ensure strategic alignment across all levels

### Added - Mobile Responsiveness

#### Index Node (`public/game/focus.html`)
- **@media (max-width: 768px)**
  - Navigation: Flex-column layout, smaller fonts (24px logo, 14px tabs)
  - Domain Tabs: Reduced padding (10px 16px), centered
  - Mission Area: Reduced padding (30px 20px)
  - Textareas: Smaller fonts (16px), reduced min-height (100px)
  - Buttons: Smaller (18px 40px padding, 20px font)
  - Month Cards: Compact size (160px min-width)

- **@media (max-width: 480px)**
  - Navigation: Very compact (20px logo, 12px tabs)
  - Mission Area: Minimal padding (25px 15px)
  - Textareas: Mobile-optimized (14px font, 15px padding)
  - Buttons: Touch-friendly (14px 30px padding)
  - Month Cards: Small (140px min-width)

#### GAS (`gas/Game_Focus_Style.html`)
- Identical mobile responsive styles as Index Node
- Same breakpoints (768px, 480px)
- Optimized for Google Apps Script rendering

### Added - Saved Maps Integration

#### Index Node UI (`public/game/focus.html:455-459`)
- **Saved Maps Section**
  - Grid layout for saved Focus Maps
  - Loading status indicator
  - Filter by domain and month
  - Click-to-load interaction
  - Responsive grid (250px min-width, auto-fill)
  - Max-height (400px) with scroll

#### Index Node Backend (`server.js:2814-2883`)
- **GET `/api/game/focus/list`**
  - Lists all saved Focus Maps
  - Query params: `domain`, `month`
  - Extracts domain/phase from filename
  - Sorts by modification date (newest first)
  - Returns: `{ ok: true, maps: [...] }`

- **GET `/api/game/focus/load`**
  - Loads specific Focus Map content
  - Path validation (security)
  - Returns markdown content
  - Returns: `{ ok: true, content, path }`

#### Index Node Frontend (`public/game/focus.html:635-694`)
- **loadSavedMaps():** Fetches and renders saved maps
- **loadMapContent(filepath):** Loads map content via API
- **Regex parsing:** Extracts Habits/Routines/Additions/Eliminations
- **Auto-fill:** Populates textareas with loaded content
- **Event triggers:** Reload on domain/month change

#### GAS UI (`gas/Game_Focus_Centre.html:36-41`)
- Saved Maps Section (identical structure to Index Node)
- Loading status indicator
- Saved maps grid

#### GAS Backend (`gas/game_focus.gs:162-233`)
- **listFocusEntries(domain, month)**
  - Lists files from Google Drive Alpha_Focus folder
  - Filters by domain if specified
  - Sorts by modification date
  - Returns: `{ ok: true, maps: [...] }`

- **loadFocusEntry(fileId)**
  - Loads file content from Google Drive
  - Returns: `{ ok: true, content, filename, url, modified }`

#### GAS Frontend (`gas/Game_Focus_Script.html:62-131`)
- **loadSavedMaps():** Calls `google.script.run.listFocusEntries()`
- **loadMapContent(fileId, filename):** Calls `google.script.run.loadFocusEntry()`
- Regex parsing for GAS markdown format (### headers)
- Auto-fill textareas

### Added - Auto-Save State System

#### Index Node Backend (`server.js:2885-2957`)
- **GET `/api/game/focus/state`**
  - Returns all 4 domain states
  - Storage: `~/AlphaOS-Vault/Game/Focus/.focus-state.json`
  - Fallback: Empty states if file doesn't exist

- **POST `/api/game/focus/state`**
  - Saves state for specific domain
  - Params: `domain, month, habits, routines, additions, eliminations`
  - Merges with existing states
  - Returns: `{ ok: true, domain, lastUpdated }`

#### Index Node Frontend (`public/game/focus.html:499-589, 779-788`)
- **focusStates object:** Stores all 4 domain states locally
- **saveCurrentDomainState():**
  - Debounced auto-save (1 second)
  - Saves to local object + server
  - Triggered on textarea input
- **loadCurrentDomainState():**
  - Loads from local object
  - Populates textareas
- **loadAllStates():**
  - Fetches all states on page load
  - Initializes focusStates object
- **Auto-save triggers:**
  - Textarea input events
  - Domain switch (save before, load after)
  - Month switch (save before, load after)

#### GAS Backend (`gas/game_focus.gs:235-300`)
- **getFocusState()**
  - Returns all 4 domain states
  - Storage: UserProperties (`FOCUS_STATE` key)
  - Fallback: Empty states if not set

- **saveFocusState(domain, month, habits, routines, additions, eliminations)**
  - Saves state to UserProperties
  - Merges with existing states
  - Returns: `{ ok: true, domain, lastUpdated }`

#### GAS Frontend (`gas/Game_Focus_Script.html:3-94, 245-248`)
- Identical structure to Index Node
- Uses `google.script.run` instead of `fetch`
- Debounced auto-save (2 seconds, due to GAS latency)
- Same auto-save triggers

### Changed

#### Navigation Flow
- Domain/Month switches now auto-save before switching
- Domain/Month switches now auto-load new state after switching
- Saved maps reload on domain/month change

#### Save Button Behavior
- "LOCK THIS MISSION" now triggers saved maps reload
- State is preserved even after locking
- Title sanitization (spaces → underscores)

### Technical Details

#### Storage Structure

**Index Node:**
```
~/AlphaOS-Vault/Game/Focus/
├── .focus-state.json              # Auto-save state (all domains)
├── BODY_focus_December_2025.md    # Locked maps
├── BEING_focus_current.md
└── ...
```

**GAS:**
```
Google Drive: Alpha_Focus/
├── Current/
│   └── FOC-20260118-1234_current_BODY.md
├── Q1/
├── Q2/
├── Q3/
└── Q4/

UserProperties:
└── FOCUS_STATE (JSON with all domain states)
```

#### State Format
```json
{
  "BODY": {
    "domain": "BODY",
    "month": "current",
    "habits": "...",
    "routines": "...",
    "additions": "...",
    "eliminations": "...",
    "lastUpdated": "2026-01-18T14:23:45.123Z"
  },
  "BEING": { ... },
  "BALANCE": { ... },
  "BUSINESS": { ... }
}
```

#### Debounce Timings
- **Index Node:** 1 second (fast local server)
- **GAS:** 2 seconds (network latency)

#### Mobile Breakpoints
- **768px:** Tablet optimization
- **480px:** Smartphone optimization

### Fixed

#### UI Issues
- Navigation header overlapping content on mobile
- Domain tabs too small to tap on mobile
- Textareas too small on mobile screens
- Month cards not scrollable horizontally on tablet

#### Integration Issues
- No way to see previously saved Focus Maps
- No way to load existing maps for editing
- Domain switching lost unsaved work
- No persistence of draft work

#### Data Flow Issues
- Only "save final version" available (no drafts)
- No indication of current focus state
- Domain state not preserved between sessions

---

## [1.0.0] - 2025-12-xx (Original Implementation)

### Initial Features
- Focus Map Centre UI (desktop only)
- 4 Domain tabs (BODY, BEING, BALANCE, BUSINESS)
- 5 Month phases (Current, Q1-Q4)
- Mission Area with 4 pillars (Habits, Routines, Additions, Eliminations)
- LOCK THIS MISSION button (save to markdown)
- Chapter 34 integration (Focus philosophy)
- Focus Rite display
- Hotkeys support
- GAS deployment (cloud fallback)

---

## Migration Notes

### From 1.0.0 to 2.0.0

**No Breaking Changes** - All existing functionality preserved.

**New Files Created:**
- Index Node: `~/AlphaOS-Vault/Game/Focus/.focus-state.json`
- GAS: UserProperties key `FOCUS_STATE`

**Existing Maps Compatible:**
- All locked maps (`.md` files) work with new load functionality
- Filename parsing extracts domain/phase automatically

**User Experience Changes:**
- Auto-save runs in background (no user action needed)
- Domain switching preserves work automatically
- Saved maps visible and loadable from UI

---

## Future Enhancements (Roadmap)

### Completed in v2.0.0
- [x] Cascade integration (Freedom → Focus → Fire) with YAML references
- [x] Fire Map export functionality
- [x] Freedom Map YAML front matter
- [x] Focus Map YAML front matter
- [x] Mobile responsiveness
- [x] Auto-save state system
- [x] Saved maps integration

### Planned Features
- [ ] Visual "Last Auto-Saved" indicator
- [ ] State for Q1-Q4 months (currently only 'current' month)
- [ ] Cascade validation (automated checks for Freedom → Focus alignment)
- [ ] IPW integration (10-year vision reference in Freedom Maps)
- [ ] Multi-user support (GAS only)
- [ ] Offline mode with sync (Index Node)
- [ ] Export to PDF
- [ ] Taskwarrior integration (auto-create tasks from Focus Map)
- [ ] Frame Map YAML references to Freedom Maps (complete the cascade)

### Under Consideration
- [ ] Version history for states
- [ ] Conflict resolution (if editing from multiple devices)
- [ ] Templates for common Focus Map patterns
- [ ] AI suggestions based on Domain patterns
- [ ] Reverse cascade queries (Freedom → which Focus Maps → which Fire Maps)

---

## Contributors

- **Implementation:** Claude Code (Anthropic)
- **Design & Architecture:** alpha (αOS System User)
- **Philosophy Foundation:** Elliott Hulse (αOS Creator)

---

## References

- [αOS Documentation](../DOCS/)
- [Index Node README](./README.md)
- [GAS AGENTS.md](../gas/AGENTS.md)
- [Focus Centre Philosophy](../DOCS/gas/game.md)
