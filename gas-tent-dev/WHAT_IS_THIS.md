# What Is This? - General's Tent Centre

## TL;DR

**Standalone Google Apps Script deployment** for General's Tent - the weekly strategic intelligence & review module of AlphaOS.

## Why Standalone?

In the AlphaOS Hub-and-Spoke architecture:

```
Router Bot (Telegram)
    ↓
Routes to Centres:
├── Door Centre (GAS) - War Stack creation
├── Game Centre (GAS) - Map management
└── Tent Centre (GAS) - Weekly review ← THIS PROJECT
```

**Problem with old setup:**
- Tent was nested inside GAS HQ
- Required navigating through multiple menus
- No direct Telegram access

**Solution:**
- **Standalone GAS project** with own bot
- **Direct Telegram commands** (`/tent`, `/week`, `/scores`)
- **Separate deployment** for cleaner architecture

## What It Does

**1. TickTick Integration**
- Pulls weekly task data
- Calculates Stack/Door scores
- Provides task summaries

**2. Weekly Digest**
- Combines TickTick + Index Node data
- Generates markdown reports
- Saves to Google Sheets for archive

**3. Telegram Bot**
- Direct commands for quick access
- Weekly automated reports (Sunday 20:00)
- Mobile-friendly interface

**4. Bridge Integration**
- Connects to Index Node (when laptop online)
- Fetches domain states & pipeline intelligence
- Falls back to cached data when offline

## Architecture

```
User (Telegram) → Tent Bot → GAS Tent Centre
                                    ↓
                              TickTick API
                                    ↓
                            Weekly Digest
                                    ↓
                        ┌───────────┴───────────┐
                        ↓                       ↓
                Google Sheets           Bridge → Index Node
                (Archive)                       (Intelligence)
```

## Files Explained

### Core
- `backend.gs` - Utilities (run_, cfg_, PROP)
- `config.gs` - Configuration helpers
- `webapp.gs` - doGet/doPost handlers

### TickTick
- `ticktick_functions.gs` - API calls
- `ticktick_fetch.gs` - Read layer with date helpers
- `tent_digest.gs` - Weekly digest builder

### Integration
- `tent_intelligence.gs` - Index Node data fetching
- `tent_automation.gs` - Weekly automation

### UI & Bot
- `telegram_bot.gs` - Bot handler
- `Index.html` - WebApp UI

### Config
- `appsscript.json` - Manifest
- `README.md` - Overview
- `DEPLOYMENT.md` - Setup guide

## How It Fits Into AlphaOS

### The 5 Pillars

**PILLAR #5: THE GAME** (Strategic Maps)

```
Frame → Freedom → Focus → Fire → Daily Game
                           ↓
                    General's Tent ← Weekly integration point
```

**Tent's Role:**
- **Not** a daily tool (that's Voice/Door/Core)
- **Not** a map builder (that's Game Centre)
- **IS** the weekly command & control:
  - Return & Report (facts)
  - Lessons Learned (synthesis)
  - Course Correction (adjustments)
  - New Targets (next week)

### Data Flow

**Inputs:**
1. TickTick tasks (STACK, DOOR tags)
2. Index Node pipeline intelligence
3. Cached historical data

**Processing:**
- Combines sources
- Generates digest
- Saves archive

**Outputs:**
1. Markdown to Vault (via Bridge)
2. Sheet for history
3. Telegram reports

## Use Cases

### Weekly Review (Sunday 20:00)
1. Automated Telegram report
2. Shows week scores
3. Strategic insights
4. Pipeline blockages

### Quick Status Check
```
/week         → Current week scores
/scores       → TickTick breakdown
/digest       → Full markdown digest
```

### Integration with Node
- Node Tent UI fetches digest via Bridge
- GAS provides TickTick layer
- Both save to different locations (Sheet vs Vault)

## What Makes It Special

**1. Dual Mode:**
- Works **with** Index Node (full intelligence)
- Works **without** Index Node (TickTick only)

**2. 24/7 Cloud:**
- Always reachable (GAS is cloud)
- Telegram works even when laptop off
- Cached data as fallback

**3. Clean Separation:**
- Own bot token
- Own deployment
- Own data store
- No dependencies on main HQ

## Next Steps After Deployment

1. **Test basic flow:**
   ```
   /start → /week → /scores → /digest
   ```

2. **Connect Router Bot:**
   - Add Tent URL to router config
   - Test routing

3. **Enable Bridge:**
   - Configure Tailscale IP
   - Test RPC calls

4. **Set weekly trigger:**
   - Sunday 20:00 automation
   - Monitor first report

## Comparison: Tent vs Other Centres

| Feature | Door Centre | Game Centre | **Tent Centre** |
|---------|-------------|-------------|----------------|
| Frequency | Weekly | Continuous | **Weekly** |
| Input | VOICE insights | User edits | **TickTick + Index** |
| Output | War Stacks | Maps | **Digest + Archive** |
| Telegram | `/war` command | `/game` links | **`/tent` bot** |
| Offline? | GAS only | GAS only | **GAS + TickTick** |
| Intelligence | Psychological inquiry | Strategic maps | **Pipeline synthesis** |

## Why Extract from HQ?

**Old:** Nested in GAS HQ → hard to find, hard to use
**New:** Standalone → direct access, clean integration

**Benefit:** Cleaner architecture, easier maintenance, better UX

## Status

- ✅ Extracted from HQ
- ✅ TickTick integration complete
- ✅ Digest builder ready
- ✅ Telegram bot handler
- ✅ Bridge integration prepared
- ⏳ Deployment pending
- ⏳ Testing pending
- ⏳ Router connection pending

## Version

v1.0.0 - Initial standalone extraction
January 2026
