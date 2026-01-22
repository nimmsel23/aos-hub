# Core4 Habit Centres - Complete Roadmap

**Created:** 2026-01-10
**Status:** PLANNING (Implementation starts Week 2)
**Philosophy:** Elliott Hulse - THE CORE (Chapters 13-18)

---

## Vision: 8 Specialized Centres for 28-or-Die

**Core Concept:**
Statt einfachem "Checkbox Tracking" (did I do this today?), bauen wir für **jedes der 8 Core4 Habits** ein spezialisiertes Centre mit:
- **Smart Tracking** (context-aware, minimal friction)
- **Data Collection** (journal-style, domain-specific)
- **Insights Generation** (trends, patterns, what's working)
- **AlphaOS Integration** (Frame Maps, Tent Reviews, DOMINION tracking)

**End Goal:**
- Daily: 1-Tap habit logging (Telegram buttons)
- Weekly: Automatic summaries for General's Tent
- Monthly: Domain dashboards (BODY/BEING/BALANCE/BUSINESS)
- Yearly: Frame Map material (progress proof, course corrections)

---

## The 8 Habit Centres

### BODY DOMAIN (1 point = Fitness 0.5 + Fuel 0.5)

#### 1. FITNESS Centre (🏋️) - Workout Logger

**Philosophy:** "Movement is life. Did you sweat today?" (Chapter 14)

**What to Track:**
- Workout Type (Strength, Cardio, Yoga, Mobility)
- Duration (minutes)
- Exercises (sets/reps/weight for strength, distance/time for cardio)
- Intensity (RPE 1-10)
- Notes (how body felt, energy level, injuries)

**Features:**
- Progressive overload tracking (weight/reps increasing?)
- Rest day logging (recovery IS training!)
- Body metrics (optional: weight, measurements, photos)
- Workout templates (save favorite routines)
- Program tracking (e.g., "Push/Pull/Legs" rotation)

**Storage (GAS):**
```
Alpha_Fitness/
├── Workouts/
│   └── 2026-01-10_Push_Session.json
├── Programs/
│   └── PPL_Template.json
├── Weekly_Summary/
│   └── 2026_WW02_Summary.json
└── Progress_Photos/
    └── 2026-01-01_Front.jpg
```

**Telegram Commands:**
- `/fit` - Quick log: "Trained today" (0.5 points)
- `/fit log` - Detailed session log
- `/fit template` - Load saved program
- `/fit progress` - Week summary

**Integration:**
- BODY Frame Map (genetic risks, strength goals)
- Fire Map (training strikes)
- Tent Review (weekly volume check)

**Priority:** TIER 1 (Critical for genetic risk management)

---

#### 2. FUEL Centre (🍽️) - Nutrition Tracker (ADVANCED)

**Philosophy:** "What did I nourish my body with today?" (Chapter 14)

**NOT Calorie Counting!**
Focus: Conscious food choices, intentional nourishment, quality over quantity.

**Unique Approach: Receipt → Pantry → Recipes → 1-Tap Meals**

Instead of logging every meal manually, we:
1. Upload grocery receipts (Telegram photo/PDF)
2. Gemini AI extracts items → builds Pantry inventory
3. Gemini generates recipes from Pantry
4. User taps button: "Ate this" → logs Fuel (0.5 points)

**What to Track:**
- **Receipts** (grocery shopping - uploaded via Telegram)
- **Pantry** (current inventory - auto-updated from receipts)
- **Meals** (what I ate - logged via Recipe buttons OR Quick Log)
- **Hydration** (optional: water intake)
- **Energy Level** (post-meal energy 1-10)

**Features:**
- Receipt Upload → Gemini Extract (items, quantities, prices)
- Pantry Management (what's in stock, what's running low)
- Recipe Generation (based on Pantry + preferences)
- 1-Tap Meal Logging (Recipe buttons)
- Quick Logs (Supplements, Fasting, Coffee+Smoothie, etc.)
- Meal Photos (optional attachment)
- Budget Tracking (price trends, spending per category)

**Data Flow:**
```
User uploads receipt (Telegram)
    ↓
GAS saves raw file (Drive) + creates receipt_stub.json
    ↓
Gemini Extract Job:
  INPUT: Receipt image/PDF
  OUTPUT: JSON { merchant, date, items[] }
  RULES: NO payment data, only food items, normalize names
    ↓
Reconcile Job:
  - Map raw names → canonical items
  - Update Pantry inventory
  - Tag categories (protein, grain, vegetable, etc.)
    ↓
Recipe Suggest Job (daily/on-demand):
  INPUT: Pantry items + user prefs (high protein, quick, warm/cold)
  OUTPUT: JSON recipes[] with steps, nutrition estimates
    ↓
Telegram Bot shows Recipe Buttons:
  🍽️ Thunfisch Salat (10 min, 42g protein)
    ✅ Gegessen   🧾 Details   🔄 Andere
    ↓
User taps "✅ Gegessen"
    ↓
Meal Log created + Fuel point logged (0.5)
    ↓
core4_log("Body", "Fuel", now, "fuel_module", user)
```

**Storage (GAS):**
```
Alpha_Fuel/
├── Receipts/              # Raw uploads (privacy-protected)
│   └── 2026-01-03_REC001.pdf
├── Extracted/             # Gemini output (items only)
│   └── 2026-01-03_REC001.json
├── Pantry/
│   └── pantry_current.json
├── Recipes/
│   └── recipes_2026-01.json
└── Meals/
    └── meals_2026_WW02.json
```

**Data Models:**

**Receipt JSON:**
```json
{
  "receipt_id": "REC-2026-01-03-001",
  "merchant": "BILLA",
  "date": "2026-01-03",
  "currency": "EUR",
  "items": [
    {
      "name": "Haferflocken",
      "quantity": 1,
      "unit": "pack",
      "weight_g": 500,
      "price_eur": 1.49,
      "category": "grain"
    },
    {
      "name": "Thunfisch in Olivenöl",
      "quantity": 2,
      "unit": "can",
      "weight_g": 160,
      "price_eur": 3.98,
      "category": "protein"
    }
  ],
  "total_eur": 23.41
}
```

**Pantry JSON:**
```json
{
  "pantry_item_id": "PAN-THUNFISCH-OLIVENOEL",
  "canonical_name": "Thunfisch in Olivenöl",
  "tags": ["protein", "fish", "canned"],
  "on_hand": {
    "quantity": 2,
    "unit": "can",
    "est_total_g": 320
  },
  "last_receipt_id": "REC-2026-01-03-001",
  "price_stats": {
    "last_eur": 1.99,
    "avg_eur_90d": 2.09
  }
}
```

**Recipe JSON:**
```json
{
  "recipe_id": "RCP-TUNA-SALAD-001",
  "title": "Thunfisch Salat",
  "time_min": 10,
  "temperature": "cold",
  "ingredients_used": [
    {
      "pantry_item_id": "PAN-THUNFISCH-OLIVENOEL",
      "quantity": 1,
      "unit": "can"
    },
    {
      "pantry_item_id": "PAN-GURKE",
      "quantity": 0.5,
      "unit": "pcs"
    }
  ],
  "missing_ingredients": [],
  "steps": [
    "Thunfisch abtropfen",
    "Gurke würfeln",
    "Mischen, würzen (Olivenöl, Zitrone, Salz)"
  ],
  "nutrition_estimate": {
    "kcal": 540,
    "protein_g": 42,
    "carbs_g": 14,
    "fat_g": 32,
    "confidence": 0.85
  }
}
```

**Meal Log JSON:**
```json
{
  "meal_id": "MEAL-2026-01-03-001",
  "timestamp": "2026-01-03T19:10:00+01:00",
  "source": "recipe_button",
  "recipe_id": "RCP-TUNA-SALAD-001",
  "items_used": [
    {
      "pantry_item_id": "PAN-THUNFISCH-OLIVENOEL",
      "quantity": 1,
      "unit": "can"
    }
  ],
  "estimated_nutrition": {
    "kcal": 540,
    "protein_g": 42
  },
  "fuel_point": 0.5,
  "core4_logged": true
}
```

**Gemini API Integration:**

**Prompt 1: Receipt Extract**
```javascript
const RECEIPT_EXTRACT_PROMPT = `
Du bist ein Receipt Parser. Extrahiere STRUKTURIERT die Lebensmittel aus diesem Kassenbon.

INPUT: Foto/PDF eines Kassenbons
OUTPUT: JSON (NUR Lebensmittel, KEINE Zahlungsdaten)

Schema:
{
  "merchant": "BILLA",
  "date": "2026-01-03",
  "items": [
    {
      "name": "Haferflocken",
      "quantity": 1,
      "unit": "pack",
      "weight_g": 500,
      "price_eur": 1.49,
      "category": "grain"
    }
  ]
}

REGELN:
- NUR Lebensmittel (keine Klopapier, Putzmittel)
- KEINE Zahlungsdaten (Kartennummern, Kontonummern)
- KEINE Adressen oder Filialnummern
- Falls unklar: null
- Normalisiere Namen (HAFERFLOCKEN → Haferflocken)
- Kategorisiere: protein, grain, vegetable, fruit, dairy, etc.
`;
```

**Prompt 2: Recipe Generation**
```javascript
const RECIPE_SUGGEST_PROMPT = `
Du bist ein Meal Planner. Generiere einfache, schnelle Rezepte aus diesen Zutaten.

INPUT: Pantry Items (was im Haus ist)
OUTPUT: JSON Array mit 5-10 Rezepten

Pantry:
${JSON.stringify(pantryItems)}

User Präferenzen:
- High Protein bevorzugt
- Schnell (max 20 min)
- Warm + Kalt Optionen

Schema:
{
  "recipe_id": "RCP-TUNA-SALAD-001",
  "title": "Thunfisch Salat",
  "time_min": 10,
  "temperature": "cold",
  "ingredients_used": [...],
  "missing_ingredients": [],
  "steps": ["...", "..."],
  "nutrition_estimate": {
    "kcal": 540,
    "protein_g": 42,
    "carbs_g": 14,
    "fat_g": 32,
    "confidence": 0.85
  }
}

REGELN:
- NUR was wirklich im Pantry ist (keine Fantasie)
- Einfache Rezepte (kein Michelin-Star)
- Realistische Nährwerte (confidence wenn unsicher)
- Variationen (warm/kalt, schnell/langsam)
`;
```

**Telegram Commands:**
- `/fuel` - Main menu (Upload, Pantry, Recipes, Log, Stats)
- `/fuel upload` - Wait for receipt photo/PDF
- `/fuel pantry` - View current inventory
- `/fuel recipes` - Today's recipe suggestions (Inline Buttons)
- `/fuel log` - Quick logs (Supplements, Fasting, Coffee, etc.)
- `/fuel stats` - Week summary (compliance, spending)

**Privacy/Security:**
- Raw receipts stored in private Drive folder (not shared)
- Extracted JSON contains NO payment data
- Merchant name without store number/address
- NO credit card numbers, NO bank account details

**Core4 Integration:**
```javascript
// When meal logged:
function logFuelPoint_(mealId, userId) {
  // Log to Core4
  core4_log("Body", "Fuel", new Date(), "fuel_module", userId);

  // Update Pantry (deduct used items)
  updatePantryInventory_(mealId);

  return { ok: true, fuel_point: 0.5 };
}
```

**Priority:** TIER 1 (MUST HAVE - Revolutionary approach)

---

### BEING DOMAIN (1 point = Meditation 0.5 + Memoirs 0.5)

#### 3. MEDITATION Centre (🧘) - Session Logger

**Philosophy:** "Connection with soul. Did I meditate today?" (Chapter 15)

**What to Track:**
- Duration (aim: 20 min daily)
- Technique (breath work, mantra, visualization, body scan)
- Quality (Distracted 1-10 Focused)
- Insights (what came up during session?)
- State After (calm/centered/energized/restless)

**Features:**
- Timer integration (start/stop in app)
- Guided session library (links to audio/video)
- Streak tracking (consecutive days)
- Technique effectiveness (which methods = best results?)
- Insight journal (searchable)

**Storage (GAS):**
```
Alpha_Meditation/
├── Sessions/
│   └── 2026-01-10_Morning_Session.json
├── Techniques/
│   └── effectiveness_log.json
├── Insights/
│   └── 2026-01_insights.md
└── Weekly_Summary/
    └── 2026_WW02.json
```

**Telegram Commands:**
- `/med` - Quick log: "Meditated today" (0.5 points)
- `/med start` - Start timer (20 min default)
- `/med log` - Detailed session log
- `/med insights` - Journal entry prompt

**Integration:**
- VOICE sessions (meditation insights → Submit/Struggle material)
- BEING Frame Map (spiritual connection tracking)
- Fire Map (daily meditation strike)

**Priority:** TIER 1 (Simple but essential)

---

#### 4. MEMOIRS Centre (📝) - DayOne-Style Journal

**Philosophy:** "Express what you've heard from your soul." (Chapter 15)

**ALREADY DESIGNED!** (ChatGPT MVP ready)

**What to Track:**
- Daily entries (freeform writing)
- Domain tags (Body/Being/Balance/Business)
- VOICE Stage tags (Stop/Submit/Struggle/Strike)
- Mood (emotional state)
- Attachments (photos, files)
- Favorites (important entries)

**Features:**
- Timeline view (like DayOne)
- Search/Filter (tags, mood, domain, date range)
- Markdown support
- Photo attachments (inline in markdown)
- Client-side encryption (optional Phase 2)

**Storage (GAS):**
```
Alpha_Journal/  (or Alpha_Memoirs/)
├── Entries/
│   └── 2026-01-10_1705_ab12cd.md
├── Attachments/
│   └── 2026-01-10_1705_ab12cd/
│       └── photo1.jpg
└── Index/
    └── Journal_Index (Google Sheet)
```

**Telegram Commands:**
- `/mem` - Quick log: "Journaled today" (0.5 points)
- `/mem write` - Open journal entry form
- `/mem today` - View today's entries
- `/mem search` - Search past entries

**GAS Code:** Already written by ChatGPT (see ChatGPT thread)

**Priority:** TIER 1 (MUST HAVE - Foundation for BEING)

---

### BALANCE DOMAIN (1 point = Partner 0.5 + Posterity 0.5)

#### 5. PARTNER Centre (👥) - Relationship Journal

**Philosophy:** "Daily deposits of appreciation for Person #1." (Chapter 16)

**What to Track:**
- Message sent ("I love you" / "I honor you" / "I appreciate you")
- Specific reason (what made me grateful TODAY?)
- Medium (text, voice note, video, letter)
- Response (optional: how did they react?)
- Relationship reflection (weekly: how is connection?)

**Features:**
- Daily prompt: "What makes me grateful for [Name] today?"
- Template messages (customize "I honor you because...")
- Streak tracker (consecutive days of appreciation)
- Relationship mood trend (over time)
- Special moments log (memories, milestones)

**Storage (GAS):**
```
Alpha_Partner/
├── Daily_Gratitude/
│   └── 2026-01-10_gratitude.json
├── Reflections/
│   └── 2026_WW02_reflection.md
├── Special_Moments/
│   └── 2026-01-05_anniversary.md
└── Weekly_Summary/
    └── 2026_WW02.json
```

**Telegram Commands:**
- `/par` - Quick log: "Appreciated partner today" (0.5 points)
- `/par send` - Template message prompt
- `/par reflect` - Weekly relationship check-in

**Integration:**
- BALANCE Frame Map (relationship goals)
- Fire Map (relationship connection strikes)
- Tent Review (weekly relationship quality)

**Priority:** TIER 2 (High value)

---

#### 6. POSTERITY Centre (💑) - Children/Legacy Journal

**Philosophy:** "Daily deposits for Person #2 (children or important person)." (Chapter 16)

**What to Track:**
- Same as Partner Centre (gratitude messages)
- **Additional for children:**
  - Milestones (first steps, achievements, funny moments)
  - Lessons taught (what did I teach them today?)
  - Quality time (what did we do together?)
  - Growth observations (how are they developing?)

**Features:**
- Multi-child support (separate tracking per child)
- Growth timeline (visual milestones)
- Legacy letters (messages for future - "read this when you're 18")
- Quality time log (activities together)

**Storage (GAS):**
```
Alpha_Posterity/
├── Daily_Gratitude/
│   └── 2026-01-10_child1_gratitude.json
├── Milestones/
│   └── 2024-03-15_first_steps.md
├── Lessons/
│   └── 2026-01-10_sharing_lesson.md
├── Legacy_Letters/
│   └── for_18th_birthday.md
└── Quality_Time/
    └── 2026-01-10_park_visit.json
```

**Telegram Commands:**
- `/pos` - Quick log: "Appreciated child/person today" (0.5 points)
- `/pos milestone` - Log special moment
- `/pos lesson` - What did I teach today?
- `/pos letter` - Write legacy letter

**Integration:**
- BALANCE Frame Map (family vision, parenting goals)
- IPW (what kind of parent do you want to be?)

**Priority:** TIER 2 (High value if applicable)

---

### BUSINESS DOMAIN (1 point = Discover 0.5 + Declare 0.5)

#### 7. DISCOVER Centre (🔍) - Learning Logger

**Philosophy:** "Learn until you have an 'aha' moment." (Chapter 17)

**What to Track:**
- Source (book, video, course, podcast, conversation)
- Topic (money, marketing, sales, leadership, skills)
- Key insight (the "aha" moment)
- How to apply (how will I use this?)
- Related to (which Door/War Stack/Goal?)
- Stop point (page number, timestamp where "aha" happened)

**Features:**
- Stop when "aha" happens (no need to finish book/video!)
- Insight library (searchable by topic)
- Source effectiveness (which sources = best insights?)
- Application tracker (did you actually USE the insight?)
- Backlinks (insight → Door War → War Stack)

**Storage (GAS):**
```
Alpha_Discover/
├── Daily_Learnings/
│   └── 2026-01-10_marketing_insight.json
├── Sources/
│   └── books_courses_podcasts.json
├── Aha_Moments/
│   └── aha_library_searchable.json
└── Applications/
    └── insight_to_action_log.json
```

**Telegram Commands:**
- `/dis` - Quick log: "Learned today" (0.5 points)
- `/dis log` - Detailed insight entry
- `/dis search` - Search past insights
- `/dis apply` - Track application

**Integration:**
- Door War (learnings → potential ideas)
- War Stacks (insights → strikes)
- BUSINESS Frame Map (skill gaps, learning goals)
- Fire Map (learning strikes)

**Priority:** TIER 2 (High value for growth)

---

#### 8. DECLARE Centre (📣) - Teaching/Share Logger

**Philosophy:** "Teach what you learned to make it stick." (Chapter 17)

**What to Track:**
- What shared (insight from Discover)
- Where shared (Twitter, blog, conversation, team meeting)
- Audience (who received it? followers, team, friend)
- Format (tweet, thread, article, verbal explanation)
- Response (engagement, questions, feedback)
- Impact (did someone apply it?)

**Features:**
- Quick share templates (turn insight → tweet/post)
- Platform tracking (where does content perform best?)
- Content library (searchable past shares)
- Engagement metrics (what topics resonate?)
- Feedback loop (response tracking)

**Storage (GAS):**
```
Alpha_Declare/
├── Daily_Shares/
│   └── 2026-01-10_twitter_thread.json
├── Platforms/
│   └── platform_performance.json
├── Content_Library/
│   └── all_shares_searchable.json
└── Engagement/
    └── response_tracking.json
```

**Telegram Commands:**
- `/dec` - Quick log: "Shared today" (0.5 points)
- `/dec share` - Log teaching moment
- `/dec template` - Generate tweet/post from insight
- `/dec stats` - What's working?

**Integration:**
- FADARO content pipeline (Declare → blog/Twitter)
- BUSINESS Fire Map (content creation strikes)
- Discover Centre (today's learning → today's teaching)
- Door War (popular content → potential courses/products)

**Priority:** TIER 2 (High value for platform building)

---

## BODY Dashboard (Special Integration)

**3-Signal System:**
- **Weight** (manual daily input)
- **Fitness** (training sessions logged)
- **Fuel** (meals logged)

**Purpose:**
Unified view of BODY domain without complex tracking.

**What to Track:**

**1. Weight (/body weight)**
- Manual input: `/body weight 85.4`
- Optional: Morning/Evening flag
- Optional: Note (e.g., "after big dinner")
- Storage: Append-only `weight_2026.jsonl`

**2. Fitness (link to Fitness Centre)**
- Did I train today? (0.5 points)
- Volume trend (total sessions/week)

**3. Fuel (link to Fuel Centre)**
- Did I eat intentionally? (0.5 points)
- Quality trend (recipe vs junk)

**Dashboard View:**
```
╔═══════════════════════════════════════╗
║        BODY DASHBOARD - Week 02       ║
╠═══════════════════════════════════════╣
║ Weight Trend:        ↘️ -0.3 kg/week  ║
║ Current:             85.4 kg          ║
║ 7-Day Avg:           85.6 kg          ║
║                                       ║
║ Fitness Compliance:  5/7 ✅           ║
║ Fuel Compliance:     6/7 ✅           ║
║                                       ║
║ Body Week Score:     11/14 (79%)      ║
╚═══════════════════════════════════════╝
```

**Storage (GAS):**
```
Alpha_Body/
├── Weight/
│   └── weight_2026.jsonl  # Append-only
├── Fitness/
│   └── fitness_2026_WW02.json  # From Fitness Centre
├── Fuel/
│   └── fuel_2026_WW02.json  # From Fuel Centre
└── Dashboard/
    └── body_dashboard_2026_WW02.json  # Cached
```

**Telegram Commands:**
- `/body` - Main menu (Log Weight, Fitness, Fuel, Dashboard)
- `/body weight 85.4` - Direct weight log
- `/body dashboard` - Show 3-signal view
- `/body trend` - Weight trend graph (text-based)

**Data Model:**

**Weight Event (JSONL):**
```json
{"type":"body_weight","ts":"2026-01-10T07:05:00+01:00","value_kg":85.4,"source":"telegram_manual","meta":{"note":"","time":"morning"}}
```

**Dashboard JSON:**
```json
{
  "week": "2026-WW02",
  "weight": {
    "current_kg": 85.4,
    "avg_7d_kg": 85.6,
    "trend_kg_per_week": -0.3,
    "direction": "decreasing",
    "logged_days": 7
  },
  "fitness": {
    "sessions_done": 5,
    "sessions_goal": 7,
    "compliance_pct": 71,
    "points": 2.5
  },
  "fuel": {
    "meals_logged": 6,
    "meals_goal": 7,
    "compliance_pct": 86,
    "points": 3.0
  },
  "body_week_score": {
    "total": 11,
    "max": 14,
    "percentage": 79
  }
}
```

**Integration:**
- BODY Frame Map (genetic risks, weight goals, training goals)
- Tent Review (weekly Body summary)
- Fire Map (Body domain strikes)

**Priority:** TIER 1 (Critical - unified BODY tracking)

---

## Technical Architecture

### Platform Decisions

**GAS (Google Apps Script):**
- **Why:** Cloud storage (Drive), always accessible, Telegram bot integration, Gemini API native
- **What:** All 8 Centres backends, Core4 integration, Receipt/Pantry/Recipe logic
- **Storage:** Google Drive (markdown + JSON), Google Sheets (indexes)

**Telegram Bot (Python/aiogram):**
- **Why:** Mobile-first UX, file uploads (receipts), inline buttons
- **What:** Commands routing, Receipt upload handling, Button generation
- **Integration:** Webhook to GAS

**Gemini API:**
- **Why:** Receipt OCR, Recipe generation, natural language processing
- **What:** Receipt Extract, Recipe Suggest, optional Chat features
- **Integration:** Called from GAS

**Node.js (Index Node):**
- **Why:** Local access, offline support, Taskwarrior integration
- **What:** Optional local caching, API endpoints for web UI
- **Integration:** Reads GAS data, writes back via Bridge

---

### Core4 Integration

**Existing System:**
- `gas/core4.gs` → `core4_log(domain, task, timestamp, source, user)`
- Storage: `Alpha_Core4/week_YYYY_WW.json`
- Telegram: `/fit`, `/fue`, `/med`, `/mem`, `/par`, `/pos`, `/dis`, `/dec`

**New Centres MUST:**
1. Call `core4_log()` when habit completed
2. Return current day's points
3. Feed weekly summaries to Tent Review

**Example Integration:**
```javascript
// In fuel.gs:
function logMealToCore4_(mealId, userId) {
  // Log to Core4
  const result = core4_log("Body", "Fuel", new Date(), "fuel_centre", userId);

  // Get today's total
  const today = core4_getToday();

  return {
    ok: true,
    fuel_point: 0.5,
    body_total: today.Body.total,  // e.g., 1.0 (Fitness + Fuel)
    daily_total: today.total  // e.g., 3.5 (all domains)
  };
}
```

---

### Data Storage Strategy

**Per Centre:**
```
Alpha_[CentreName]/
├── Daily/              # Daily logs (append-only)
├── Weekly/             # Weekly summaries (cached)
├── Index/              # Google Sheet (searchable)
└── Meta/               # Configuration, templates
```

**JSON-first:**
- All data stored as JSON (markdown for human-readable entries)
- Append-only logs (no overwrites)
- Schema validation (no Gemini hallucinations accepted)

**Privacy:**
- Receipts: Private Drive folder (not shared)
- Personal data: Encrypted at rest (Drive default)
- NO payment data stored (validation rule)

---

## Implementation Roadmap

### Phase 1: Foundation (Week 2-3, 2026)

**TIER 1 Centres (Must Have):**
1. **✅ MEMOIRS Centre** - Already designed (ChatGPT MVP)
   - Deploy GAS code
   - Test Telegram commands
   - Integrate with Core4

2. **FITNESS Centre** - Critical for BODY
   - Build workout logger
   - Program templates
   - Core4 integration

3. **MEDITATION Centre** - Simple but essential
   - Timer integration
   - Technique tracking
   - Insight journal

4. **FUEL Centre (MVP)** - Revolutionary approach
   - Receipt upload (GAS + Telegram)
   - Gemini Extract integration
   - Pantry management (basic)
   - Recipe generation (Gemini)
   - 1-Tap meal logging
   - Core4 integration

5. **BODY Dashboard** - Unified view
   - Weight tracking
   - 3-signal dashboard
   - Trend visualization

**Deliverables:**
- 5 working Centres (Memoirs, Fitness, Meditation, Fuel MVP, Body Dashboard)
- Telegram bot commands functional
- Core4 logging integrated
- Weekly Tent summaries working

---

### Phase 2: Relationships + Learning (Week 4-5, 2026)

**TIER 2 Centres (High Value):**
6. **PARTNER Centre** - Daily gratitude
7. **DISCOVER Centre** - Learning tracker
8. **DECLARE Centre** - Teaching tracker
9. **POSTERITY Centre** - Children/legacy (if applicable)

**Fuel Centre Enhancements:**
- Pantry inventory management (smart depletion)
- Recipe preferences learning
- Budget tracking (price trends)
- Nutrition insights (optional)

**Deliverables:**
- All 8 Centres operational
- Complete 28-or-Die tracking
- Advanced Fuel features
- Full BALANCE + BUSINESS domain tracking

---

### Phase 3: Analytics + Insights (Week 6-8, 2026)

**Features:**
- Cross-domain correlations (e.g., Fitness → Meditation quality)
- Streak tracking (7-day, 30-day, 100-day)
- Pattern recognition (what's working?)
- Tent Review automation (weekly summaries)
- Frame Map material generation (domain dashboards)

**Advanced:**
- Voice input (dictate entries)
- Photo OCR (extract text from images)
- Gemini Chat (conversational logging)
- Predictive insights ("You usually skip Fuel on Fridays")

---

## ChatGPT Implementation Guide

**For Fuel + Body Module (Next Session):**

Copy this entire document section: "2. FUEL Centre" + "BODY Dashboard"

Add this prompt:

```markdown
# Implementation Request: Fuel + Body Module

## Context
- Part of AlphaOS Core4 Tracker (28-or-Die system)
- Existing: GAS Core4 (`gas/core4.gs`), Telegram Bot (Python/aiogram)
- Storage: Google Drive (`Alpha_Fuel/`, `Alpha_Body/`)

## Build Complete GAS Code For:

### 1. fuel.gs (Receipt → Pantry → Recipes → Meals)
Functions needed:
- `fuel_uploadReceipt(fileId, userId)`
- `fuel_extractReceipt(receiptId)` → calls Gemini
- `fuel_reconcilePantry(extractedItems)`
- `fuel_generateRecipes(pantryItems, userPrefs)` → calls Gemini
- `fuel_logMeal(recipeId, userId)` → calls core4_log()
- `fuel_getPantry(userId)`
- `fuel_getRecipesToday(userId)`
- `fuel_getWeekSummary(weekKey, userId)`

### 2. body.gs (Weight + Dashboard)
Functions needed:
- `body_logWeight(kg, userId, note)`
- `body_getDashboard(weekKey, userId)`
- `body_getWeightTrend(days, userId)`

### 3. Gemini API Integration
- Receipt Extract prompt (strict schema, NO payment data)
- Recipe Suggest prompt (pantry-based, user prefs)
- Schema validation (reject hallucinations)

### 4. Telegram Bot Commands (aiogram)
- `/fuel` menu
- `/fuel upload` → wait for file
- `/fuel recipes` → show buttons
- `/fuel log` → quick log
- `/body weight <kg>` → direct log
- `/body dashboard` → 3-signal view

## Requirements
1. Privacy-first (NO payment data storage)
2. JSON Schema validation (no hallucinations)
3. 1-Tap UX (buttons > forms)
4. AlphaOS-konform (0.5 points, no dogma)
5. Core4 integration (`core4_log()`)

## Deliverable
Complete, production-ready GAS code + Telegram bot extension.
```

---

## Success Metrics

**Daily:**
- 1-Tap habit logging (< 5 seconds per habit)
- All 8 habits tracked = 4 points/day

**Weekly:**
- 28 points achieved = "28-or-Die" success
- Automatic Tent Review summaries
- Domain compliance (which habits neglected?)

**Monthly:**
- Domain dashboards (BODY/BEING/BALANCE/BUSINESS)
- Trend analysis (what's improving?)
- Frame Map material (progress proof)

**Yearly:**
- Complete habit history (searchable)
- Pattern insights (cross-domain correlations)
- DOMINION evidence (mastery across all 4 domains)

---

## Notes & Decisions

**Design Principles:**
1. **Philosophy First** - Elliott Hulse defines "What MUST Be"
2. **Minimal Friction** - 1-Tap logging beats detailed forms
3. **Data Ownership** - Your Drive, your data, your control
4. **Smart Defaults** - AI assists, you decide
5. **No Dogma** - Track what matters, skip what doesn't

**Open Questions:**
- Meditation timer: Built-in or external link?
- Posterity: One centre or separate per child?
- Gemini costs: Budget/rate limiting needed?
- Photos: Drive storage limits?
- Voice input: Priority for which centres?

---

**Last Updated:** 2026-01-10
**Status:** PLANNING COMPLETE - Ready for ChatGPT implementation
**Next Step:** Build Fuel + Body Module (Week 2)
**Owner:** alpha (FADARO)
