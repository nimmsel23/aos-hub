# Frame Map Claude Session - Domain-State System Context

**Use this prompt when working on Frame Map updates to understand the new Domain-State infrastructure.**

---

## 🏛️ CONTEXT: Domain-State System

You are working on a **Frame Map** for one of the 4 Domains (BODY/BEING/BALANCE/BUSINESS).

**NEW INFRASTRUCTURE (implemented Jan 2026):**

We now have a **Domain-State System** that tracks strategic state across all centres (GAME/DOOR/VOICE/CORE4) for each domain.

### What are Domain-States?

**Domain-State** = JSON file per domain storing:

```json
{
  "domain": "BODY",
  "version": "1.0.0",
  "updated_at": "2026-01-19T...",
  "week": "2026-W04",

  "frame": {
    "file": "Game/Frame/BODY_frame.md",
    "status": "Training inconsistent, genetic risk known",
    "last_shift": "2025-10-15",
    "updated_at": "2026-01-19T..."
  },

  "freedom": {
    "file": "Game/Freedom/BODY_freedom.md",
    "ipw": "Athletic 50-year-old with genetic risk managed",
    "alignment": "partial"
  },

  "focus": {
    "file": "Game/Focus/BODY_Q1-2026.md",
    "mission": "Establish consistent training base",
    "serves_freedom": true
  },

  "fire": {
    "week": "2026-W04",
    "hits": [...],
    "completion": 0.0,
    "serves_focus": null
  },

  "voice": {
    "latest_session": "Voice/BODY_session_2026-01-15.md",
    "latest_strike": "I commit to morning movement ritual",
    "session_count": 6,
    "integrated": false
  },

  "war_stacks": [...],
  "core4": {...},
  "synthesis": {...}
}
```

**Storage:** `~/AlphaOS-Vault/.states/{DOMAIN}.json`

---

## 🎯 WHY THIS MATTERS FOR FRAME MAP WORK

### Before Domain-States:

**Problem:**
- Frame Map = isolated markdown file
- No connection to other centres
- Manual checking: "Does my Focus serve this Frame?"
- No visibility into cascade breakdown
- No pattern recognition across domains

**Example:**
```
You update BODY Frame: "Training inconsistent"
→ Manual check: Does my Focus mission still make sense?
→ Manual check: Are my Fire Hits aligned?
→ Manual check: Do I have VOICE insights to integrate?
→ Result: Easy to miss misalignments
```

### After Domain-States:

**Solution:**
- Frame Map update triggers domain-state update
- **Automatic cascade analysis** detects misalignment
- **Synthesis engines** recognize cross-domain patterns
- **Strategic Intelligence** provided (not just data display)

**Example:**
```
You update BODY Frame: "Training inconsistent"
→ Domain-state updated automatically
→ Synthesis engines run:
   ├─ Temporal Cascade: "Fire Hits don't serve Focus" ❌
   ├─ Pipeline Flow: "6 VOICE sessions → 0 War Stacks" ❌
   └─ Cross-Domain: "Fire without grounding pattern" ⚠️
→ General's Tent Report (Sunday 20:00):
   "🚨 BODY Frame shifted to 'inconsistent' but Fire Hits still
    targeting strength gains. Redirect execution or update Focus."
```

---

## 📊 THE 3 SYNTHESIS ENGINES

When you update a Frame Map, these engines analyze the impact:

### 1. Cross-Domain Synthesis

**Question:** How does this Frame state relate to other domains?

**Patterns detected:**
- **Spiritual Bypassing:** BUSINESS high, BEING low → avoidance pattern
- **Foundation Unlocking:** BALANCE breakthrough → unlocks other domains
- **VOICE Integration Gap:** Many sessions but no daily practice
- **Fire without Grounding:** High execution, low Core4 → burnout risk
- **Domino Door Opportunity:** One domain breakthrough opens others

**Example:**
```
BALANCE Frame: "Wien-Sanctuary achieved" (Sep 2025)
→ Cross-Domain Synthesis detects:
   "BALANCE breakthrough (first autonomous space in 6 years)
    unlocked BODY training (home gym accessible) and
    BEING practice (quiet space for meditation)"
```

### 2. Temporal Cascade Analysis

**Question:** Does this Frame align with Freedom → Focus → Fire?

**Cascade levels:**
- **Fire → Focus:** Do weekly Hits serve monthly mission?
- **Focus → Freedom:** Does mission move toward 10-year vision?
- **Freedom → Frame:** Is vision grounded in current reality?

**Cascade Health:**
- `aligned` = Green 🟢 (healthy flow)
- `partial` = Yellow 🟡 (some connection)
- `blocked` = Red 🔴 (misalignment)

**Frame Shift Detection:**
```
IF Frame.last_shift within 30 days:
  → Trigger cascade update check
  → "Frame shifted recently, verify Freedom/Focus/Fire still aligned"
```

**Example:**
```
BUSINESS Frame shift: "Vitaltrainer certification started" (Nov 2025)
→ Temporal Cascade Analysis:
   ├─ Freedom: "Authority platform" ✅ aligned
   ├─ Focus: "Platform setup Q1-2026" ✅ aligned
   └─ Fire: "WordPress theme, X profile" ✅ aligned
→ Verdict: Cascade healthy 🟢
```

### 3. Pipeline Flow Diagnosis

**Question:** Is energy flowing from VOICE → DOOR → FIRE?

**Pipeline stages:**
- **VOICE → DOOR:** Sessions converting to War Stacks?
- **DOOR → FIRE:** War Stacks converting to weekly Hits?

**Health scores:**
- `0.0-0.3` = Red 🔴 (blockage)
- `0.4-0.7` = Yellow 🟡 (partial flow)
- `0.8-1.0` = Green 🟢 (healthy flow)

**Example:**
```
BODY Frame: "Training inconsistent"
→ Pipeline Flow Diagnosis:
   ├─ VOICE: 6 sessions exist ✅
   ├─ DOOR: 0 War Stacks ❌
   └─ FIRE: 0 weekly Hits ❌
→ Diagnosis: "VOICE material exists but not converting to execution.
              Pipeline blocked at VOICE→DOOR stage."
→ Correction: "Create War Stack from latest VOICE STRIKE.
               Extract 4 Hits from VOICE insights."
```

---

## 🔄 HOW DOMAIN-STATES UPDATE

### Automatic Updates (Index Node)

When certain events happen, domain-states auto-update:

1. **Frame Map saved** → `frame` section updated
2. **Fire Map saved** → `fire` section updated
3. **War Stack created** → `war_stacks` array updated
4. **VOICE session saved** → `voice` section updated
5. **Core4 logged** → `core4` metrics updated

### Manual Updates (via API)

```bash
# Update Frame section only
curl -X POST http://127.0.0.1:8799/api/tent/state/BODY \
  -H "Content-Type: application/json" \
  -d '{
    "frame": {
      "status": "Training inconsistent, genetic risk known",
      "last_shift": "2026-01-15"
    }
  }'
```

### Initial Generation

```bash
# Generate domain-states from existing vault data
curl -X POST http://127.0.0.1:8799/api/tent/init

# Scans:
# - Game/Frame/*.md
# - Game/Freedom/*.md
# - Game/Focus/*.md
# - Game/Fire/*.md
# - Door/War-Stacks/*.md
# - Voice/*.md
# - Alpha_Core4/*.json
```

---

## 🎯 WHAT YOU SHOULD DO WHEN UPDATING FRAME MAP

### Step 1: Read Current Domain-State

```bash
# Check current BODY state
curl http://127.0.0.1:8799/api/tent/state/BODY | jq
```

**What to look for:**
- `frame.status` - Current Frame status
- `frame.last_shift` - When did Frame last change?
- `focus.mission` - Current Focus mission
- `fire.hits` - This week's execution
- `voice.latest_strike` - Latest VOICE insight
- `war_stacks` - Active tactical plans

### Step 2: Update Frame Map (Markdown)

Write/edit the Frame Map markdown file:

```markdown
# BODY Frame Map - 2026-W04

## Current Reality (Frame)

**Status:** Training inconsistent, genetic risk known

**Situation:**
- Genetic testing completed (Oct 2025)
- Risk factors identified: [list]
- Training frequency: 1-2x per week (target: 4x)
- Wien-Sanctuary available (home gym setup pending)

**Last Shift:** 2025-10-15 (genetic test results received)

## Constraints
- Time: Ausbildung priority until March 2026
- Energy: ADHS management ongoing
- Space: Home gym not yet set up

## Opportunities
- Wien-Sanctuary = first autonomous space in 6 years
- Genetic data = precision targeting possible
- Morning availability = routine window

---

**Next Review:** 2026-Q2 (post-certification)
```

### Step 3: Trigger Domain-State Update

**Option A: Automatic** (if Index Node watching vault changes)
- Save markdown file
- Index Node detects change
- Domain-state updates automatically

**Option B: Manual** (trigger sync)
```bash
# Re-scan vault and update domain-state
curl -X POST http://127.0.0.1:8799/api/tent/init
```

### Step 4: Check Cascade Impact

```bash
# Run temporal cascade analysis
curl http://127.0.0.1:8799/api/tent/synthesis/temporal | jq

# Check for Frame shift impact
jq '.synthesis.frame_shifts[] | select(.domain == "BODY")' response.json
```

**Questions to ask:**
- Does my Focus mission still make sense given this Frame?
- Are my Fire Hits aligned with current reality?
- Do I need to update Freedom vision based on Frame shift?

### Step 5: Review General's Tent Synthesis

```bash
# Get complete strategic intelligence
curl http://127.0.0.1:8799/api/tent/synthesis/complete | jq
```

**Look for:**
- Cross-domain patterns involving this Frame
- Pipeline blockages related to this domain
- Actionable corrections

---

## 🧠 FRAME MAP PRINCIPLES WITH DOMAIN-STATES

### Principle 1: Frame Determines Downstream

```
Frame shifts → Check all downstream alignment

Example:
BODY Frame: "Training inconsistent" → "Training consistent"
  ↓
Check Focus: Is "establish training base" still needed?
  ↓
Check Fire: Are Hits still appropriate?
  ↓
Update or confirm alignment
```

**Domain-State System does this automatically.**

### Principle 2: Frame Reflects Reality (not aspiration)

**Wrong:**
```
Frame: "Athletic, consistent training"
Reality: 1x per week, inconsistent
```

**Right:**
```
Frame: "Training inconsistent, building foundation"
Freedom: "Athletic 50-year-old" (aspiration)
Focus: "Establish consistent base" (bridge)
```

**Domain-State System detects misalignment:**
```
Pipeline Flow Diagnosis:
"Frame status = inconsistent but Fire Hits targeting
 advanced strength. Mismatch detected."
```

### Principle 3: Frame Updates Trigger Cascade Review

**When Frame shifts significantly:**

1. Temporal Cascade Analysis runs
2. Freedom alignment checked
3. Focus mission validated
4. Fire Hits reviewed
5. VOICE insights checked for integration

**You'll see in General's Tent Report:**
```
📈 FRAME SHIFT DETECTED (30 days ago)
Domain: BODY
New Status: "Training inconsistent"
Cascade Updates Needed:
  - Update Freedom Map (alignment check)
  - Adjust Focus mission (bridge work)
  - Re-align Fire Hits (execution redirect)
```

---

## 💡 PRACTICAL EXAMPLES

### Example 1: BODY Frame Update (Negative Shift)

**Situation:** Training was consistent, now inconsistent (injury/life event)

**Before Domain-States:**
```
1. Update Frame markdown
2. Manually remember to check Focus
3. Manually remember to adjust Fire Hits
4. Hope you don't forget anything
```

**With Domain-States:**
```
1. Update Frame markdown
2. Domain-state auto-updates
3. Synthesis engines detect:
   - Fire Hits still targeting "strength gains" (misaligned)
   - Focus mission "advanced hypertrophy" (misaligned)
   - War Stack "competition prep" (misaligned)
4. General's Tent Report (Sunday):
   "🚨 BODY Frame shifted to 'inconsistent' but execution
    still targeting advanced goals. Recommend:
    - Reduce Fire Hits from 4 to 2
    - Update Focus to 'rebuild foundation'
    - Archive advanced War Stacks"
```

### Example 2: BALANCE Frame Update (Positive Shift)

**Situation:** Wien-Sanctuary achieved (first autonomous space in 6 years)

**Before Domain-States:**
```
1. Update BALANCE Frame
2. Don't realize this unlocks other domains
3. Miss opportunity for cascading improvements
```

**With Domain-States:**
```
1. Update BALANCE Frame: "Wien-Sanctuary achieved"
2. Cross-Domain Synthesis detects:
   "Foundation unlocking pattern: BALANCE breakthrough
    enables BODY (home gym), BEING (quiet space),
    BUSINESS (work environment)"
3. General's Tent Report:
   "🟢 BALANCE Frame shift unlocked opportunities:
    - BODY: Home gym now feasible
    - BEING: Meditation space available
    - BUSINESS: Dedicated work setup possible
    Recommend: Create War Stacks for space optimization"
```

### Example 3: BUSINESS Frame Update (Strategic Pivot)

**Situation:** Vitaltrainer Ausbildung started (Nov 2025)

**Before Domain-States:**
```
1. Update BUSINESS Frame
2. Manually check if Freedom/Focus/Fire aligned
3. Uncertain if this serves long-term vision
```

**With Domain-States:**
```
1. Update BUSINESS Frame: "Ausbildung Q4-2025 to Q1-2026"
2. Temporal Cascade Analysis:
   - Freedom: "Authority platform" ✅ aligned
   - Focus: "Platform setup" ✅ aligned
   - Fire: "Certification study + platform work" ✅ aligned
3. Cross-Domain Synthesis:
   - Pattern: "Credibility foundation for teaching"
   - Domino Door: "Certification → Content → Community"
4. General's Tent Report:
   "🟢 BUSINESS Frame shift well-aligned. Cascade healthy.
    Ausbildung serves Freedom vision (teaching authority).
    Continue current trajectory."
```

---

## 🔧 TECHNICAL INTEGRATION

### Frame Map Template (with domain-state metadata)

Add YAML frontmatter to Frame Maps:

```markdown
---
domain: BODY
map_type: frame
status: Training inconsistent, genetic risk known
last_shift: 2025-10-15
updated_at: 2026-01-19
tags: [frame, body, training, genetic-risk]
---

# BODY Frame Map - 2026-W04

[Content continues...]
```

**Why?**
- Index Node can parse frontmatter
- Automatic domain-state sync
- Metadata queryable via APIs

### API Endpoints for Frame Work

```bash
# Get Frame state for domain
GET /api/tent/state/BODY
→ Returns: { domain: "BODY", frame: {...}, ... }

# Update Frame section only
POST /api/tent/state/BODY
Body: { "frame": { "status": "...", "last_shift": "..." } }

# Get Frame shift history
GET /api/tent/synthesis/temporal
→ Returns: { frame_shifts: [...] }

# Get cascade health for domain
GET /api/tent/synthesis/temporal?domain=BODY
→ Returns: { cascade_health: { fire_to_focus: "aligned", ... } }
```

---

## 📋 FRAME MAP CHECKLIST (with Domain-States)

When working on Frame Map:

### Before Starting

- [ ] Read current domain-state: `curl .../api/tent/state/{DOMAIN}`
- [ ] Check last shift date (recent shifts need extra care)
- [ ] Review synthesis insights: `curl .../api/tent/synthesis/complete`

### During Frame Update

- [ ] Be honest about current reality (Frame ≠ aspiration)
- [ ] Note significant changes (date + description)
- [ ] Consider cross-domain impacts (does this affect other domains?)
- [ ] Use YAML frontmatter for metadata

### After Frame Update

- [ ] Trigger domain-state sync: `curl -X POST .../api/tent/init`
- [ ] Check temporal cascade: `curl .../api/tent/synthesis/temporal`
- [ ] Verify pipeline flow: `curl .../api/tent/synthesis/pipeline`
- [ ] Review actionable corrections: `curl .../api/tent/component/corrections`

### Cascade Review (if Frame shifted)

- [ ] Does Freedom vision still make sense?
- [ ] Does Focus mission need adjustment?
- [ ] Are Fire Hits still aligned?
- [ ] Should War Stacks be updated/archived?
- [ ] Are VOICE insights waiting for integration?

---

## 🎯 EXPECTED BEHAVIOR

### When you update BODY Frame:

1. **Save markdown** → `Game/Frame/BODY_frame.md`
2. **Index Node detects** → Parses YAML frontmatter
3. **Domain-state updates** → `.states/BODY.json` updated
4. **Synthesis runs** (on next API call or Sunday trigger)
5. **General's Tent Report** includes Frame shift analysis

### What you'll see in Tent Report:

```
📈 FRAME SHIFTS (Last 30 days):
Domain: BODY
Date: 2026-01-15 (4 days ago)
New Status: "Training inconsistent, genetic risk known"

Cascade Updates Needed:
  - Update Focus mission (current: "advanced hypertrophy")
  - Re-align Fire Hits (current: strength-focused)
  - Integrate VOICE session insights (6 sessions waiting)

Recommended Actions:
  1. Create War Stack "Training Foundation Rebuild"
  2. Update Focus Q1-2026 to "Establish consistency"
  3. Reduce Fire Hits from 4 to 2 per week
```

---

## 🚀 GETTING STARTED

### Quick Start Checklist

1. **Initialize domain-states** (if not done):
   ```bash
   curl -X POST http://127.0.0.1:8799/api/tent/init
   ```

2. **Check current Frame state**:
   ```bash
   curl http://127.0.0.1:8799/api/tent/state/BODY | jq '.frame'
   ```

3. **Update Frame Map** (markdown file with YAML frontmatter)

4. **Verify update**:
   ```bash
   curl -X POST http://127.0.0.1:8799/api/tent/init
   curl http://127.0.0.1:8799/api/tent/state/BODY | jq '.frame'
   ```

5. **Check cascade impact**:
   ```bash
   curl http://127.0.0.1:8799/api/tent/synthesis/temporal | jq
   ```

6. **Review corrections**:
   ```bash
   curl http://127.0.0.1:8799/api/tent/component/corrections | jq
   ```

---

## 📚 RELATED DOCUMENTATION

- `TENT_ARCHITECTURE.md` - Complete synthesis engine architecture
- `domain-state-schema.json` - JSON schema for domain-states
- `TENT_GAS_SETUP.md` - Setup General's Tent bot (Telegram reports)
- `ROUTER_ON_DEMAND.md` - Future Router Bot optimization

---

## ✅ SUMMARY

**What changed:**
- Frame Maps now connected to **Domain-State System**
- **Automatic cascade analysis** when Frame shifts
- **Cross-domain pattern recognition** (not just isolated data)
- **Strategic Intelligence** via General's Tent Reports
- **Pipeline flow diagnosis** (VOICE → DOOR → FIRE)

**What you should do:**
- Update Frame Maps with YAML frontmatter
- Trigger domain-state sync after updates
- Review cascade impact (temporal analysis)
- Check General's Tent Report (Sundays 20:00)
- Integrate actionable corrections

**Bottom line:**
Frame Map work is now **strategic** (not just documentation). The system helps you detect misalignments, recognize patterns, and get actionable intelligence across all centres.

**Frame determines downstream** - the system ensures this principle is enforced automatically. 🎯
