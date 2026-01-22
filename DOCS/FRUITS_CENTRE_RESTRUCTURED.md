# Fruits Centre Documentation

**Fruits Map** - Daily Results Tracking (Part of THE VOICE)

**Last Updated:** 2026-01-10

---

## AlphaOS Philosophy: What MUST Be

> "Fruit: What results or outcomes have you gotten from this mindset? And what do you want the results to be?" — Elliott Hulse (Chapter 21 - Submit)

### Purpose

**Daily Results Reflection** - Track outcomes as part of VOICE/Submit radical honesty.

**Position in AlphaOS:**
- Part of THE VOICE (Pillar #3)
- Specifically: **SUBMIT phase** (Stage #2)
- One of the **4 Fs**: Facts, Feelings, Focus, **Fruit**

---

## The 4 Fs (VOICE/Submit)

**SUBMIT = Acknowledging truth of Facts, Feelings, Focus, and Fruit**

### 1. Facts
**Question:** What are the undeniable realities of your current situation?
- No exaggerations, no minimizing
- Pure, objective truth

### 2. Feelings
**Question:** How do you truly feel about these facts?
- Emotions are complex and layered
- Go beyond surface reactions

### 3. Focus
**Question:** What has been your mindset toward these facts and feelings?
- In denial? Avoiding truth? Confronting head-on?

### 4. Fruit (THIS CENTRE)
**Question:** What results or outcomes have you gotten from this mindset?
- AND: What do you want the results to be?

**Philosophy:**
> "By their fruit, you shall know them. Results are the ultimate measure of character and commitment." — THE ALPHA CODE

**Key Insight:**
- Your **fruit** (results) reveals the truth
- Can't fool yourself or others with words
- Outcomes of actions reveal true nature
- Fruit = ultimate measuring stick for success

---

## What MUST Happen

### Daily Fact Questions

**Purpose:**
- Daily check-in on **results** in all 4 Domains
- Radical honesty about what's working / not working
- Track fruit (outcomes) over time

**Format:**
- Questions per domain (Body/Being/Balance/Business)
- Daily prompts (Telegram bot OR WebApp)
- Answer storage (Drive + Sheet index)

**Outcome:**
- Clear view of results trend
- Honest assessment of progress
- Data for course correction

---

## Implementation: What IS

### Multi-Platform Status

| Component | GAS | Node.js | Python/CLI |
|-----------|-----|---------|------------|
| **Fruits Questions** | ✅ Active | ✅ Active | ⏳ Missing |
| **Daily Prompts** | ✅ Active (Bot) | ⏳ Missing | ⏳ Missing |
| **Answer Storage** | ✅ Active | ✅ Active | ⏳ Missing |
| **History View** | ✅ Active | ✅ Active | ⏳ Missing |

---

### GAS Implementation

#### Entry
- **UI:** Inline in HQ (Fruits section)
- **Backend:** `gas/fruits.gs`
- **Questions UI:** `gas/fruits_questions.html`

#### Storage
- **Drive Folder:** `Alpha_Game/Fruits`
- **Sheet:** `FRUITS_SHEET_ID`
  - Tabs: Answers, Users, Logs

#### API (GAS Functions)

**Data Management:**
```javascript
fruits_getAllData()                           // All answers + users
fruits_saveAnswer(section, question, answer)  // Save single answer
fruits_saveAnswerWithMeta(...)                // Save with timestamp/user
```

**Bot Integration:**
```javascript
dailyQuestion()  // Daily bot prompt (Telegram)
```

#### Script Properties
```javascript
FRUITS_BOT_TOKEN           // Telegram bot token
FRUITS_WEBHOOK_URL         // Webhook URL
FRUITS_SHEET_ID            // Google Sheet ID
FRUITS_DRIVE_FOLDER_ID     // Drive folder ID
FRUITS_DEFAULT_CHAT_ID     // Default Telegram chat
```

#### Features
- Daily Telegram bot prompts
- WebApp and Bot share same data store
- Skipped questions tracked via Script Properties
- Multi-user support

---

### Node.js Implementation

#### Entry
- **UI:** `http://127.0.0.1:8799/facts`

#### Storage
- **Questions JSON:** `data/fruits_questions.json`
- **Store JSON:** `FRUITS_STORE` (default: `~/AlphaOS-Vault/Game/Fruits/fruits_store.json`)
- **Export Dir:** `FRUITS_EXPORT_DIR` (default: `~/AlphaOS-Vault/Game/Fruits`)

#### API (Node.js Endpoints)

**Question Management:**
```bash
GET /api/fruits                # Get all data
GET /api/fruits/users          # List registered users
POST /api/fruits/register      # Register new user
```

**Answer Flow:**
```bash
POST /api/fruits/next          # Get next question
POST /api/fruits/answer        # Save answer
POST /api/fruits/skip          # Skip question
```

**Export:**
```bash
POST /api/fruits/export        # Export to markdown
```

#### Environment Variables
```bash
FRUITS_QUESTIONS     # Path to questions JSON
FRUITS_DIR           # Data directory
FRUITS_STORE         # Store JSON path
FRUITS_EXPORT_DIR    # Export directory (Vault)
```

#### Features
- Local JSON storage
- Vault export (Obsidian-compatible)
- Multi-user support
- Question queue system

---

## Data Flow (Complete System)

### GAS Flow (Telegram Bot)

```
Daily Trigger (e.g., 08:00)
    ↓
dailyQuestion() → Telegram bot
    ↓
User answers via Telegram
    ↓
fruits_saveAnswer(section, question, answer)
    ↓
Save to Sheet: FRUITS_SHEET_ID/Answers
    ↓
Export to Drive: Alpha_Game/Fruits/YYYY-MM-DD.md
```

### GAS Flow (WebApp)

```
User opens HQ → Fruits section
    ↓
fruits_questions.html loads
    ↓
User selects domain + question
    ↓
Answer submitted
    ↓
fruits_saveAnswerWithMeta(...) → Sheet + Drive
```

### Node.js Flow

```
User → http://127.0.0.1:8799/facts
    ↓
POST /api/fruits/next
    ↓
Return: { section: "Body", question: "...", id: "..." }
    ↓
User answers
    ↓
POST /api/fruits/answer { id, answer }
    ↓
Save to: fruits_store.json
    ↓
Optional: POST /api/fruits/export → Vault markdown
```

---

## Questions Structure (Example)

### Sample Questions per Domain

**BODY (Physical Results):**
- "Did you move your body today? (Fitness)"
- "Did you fuel yourself well today? (Nutrition)"
- "How's your energy level? (Recovery)"

**BEING (Inner Results):**
- "Did you meditate today? (Connection)"
- "Did you journal today? (Reflection)"
- "Do you feel aligned with your purpose? (Meaning)"

**BALANCE (Relationship Results):**
- "Did you express gratitude to partner today?"
- "Did you connect with your children today?"
- "Do you feel balanced in your relationships?"

**BUSINESS (Financial Results):**
- "Did you learn something new about money today? (Discover)"
- "Did you share what you learned today? (Declare)"
- "Are you moving toward financial goals?"

**Format (JSON):**
```json
{
  "sections": {
    "Body": [
      { "id": "body_fitness", "text": "Did you move your body today?" },
      { "id": "body_fuel", "text": "Did you fuel yourself well today?" }
    ],
    "Being": [ ... ],
    "Balance": [ ... ],
    "Business": [ ... ]
  }
}
```

---

## Testing

### Quick Smoke Test

```bash
# 1. Test via GAS (Telegram Bot)
# Send to bot: /start
# Bot should prompt with daily question
# Answer: "Yes, I trained today"
# Verify: Sheet updated + Drive file created

# 2. Test via GAS (WebApp)
# Open: HQ → Fruits section
# Select: Body → Fitness question
# Answer: "Yes"
# Verify: Sheet updated

# 3. Test via Node.js
curl http://127.0.0.1:8799/api/fruits/next
# Returns: { section: "Body", question: "...", id: "..." }

curl -X POST http://127.0.0.1:8799/api/fruits/answer \
  -H "Content-Type: application/json" \
  -d '{"id": "body_fitness", "answer": "Yes, trained 45min"}'

curl -X POST http://127.0.0.1:8799/api/fruits/export
# Verify: Markdown file created in Vault
```

---

## Setup Checklist

### GAS Setup (Run Once)

```javascript
// 1. Create Fruits Sheet (auto or manual)
FRUITS_SHEET_ID = "..."
FRUITS_DRIVE_FOLDER_ID = "..."  // Alpha_Game/Fruits

// 2. Deploy Telegram Bot
FRUITS_BOT_TOKEN = "..."
FRUITS_WEBHOOK_URL = "..."
FRUITS_DEFAULT_CHAT_ID = "..."

// 3. Set up daily trigger
// Script Editor → Triggers → dailyQuestion() → Time-driven → Day timer → 8am

// 4. Test
dailyQuestion()  // Manual run
```

### Node.js Setup

```bash
# .env
FRUITS_QUESTIONS=/path/to/fruits_questions.json
FRUITS_DIR=~/.local/share/alphaos/fruits
FRUITS_STORE=~/AlphaOS-Vault/Game/Fruits/fruits_store.json
FRUITS_EXPORT_DIR=~/AlphaOS-Vault/Game/Fruits
```

### First Week Workflow

**Monday:**
1. Morning: Telegram bot sends daily question
2. User answers via bot OR WebApp
3. Answer saved to Sheet + Drive

**Daily:**
- Continue answering questions (one per day OR batch)

**Sunday (Weekly Review):**
1. Review all answers from week
2. Identify patterns (what fruit/results did you actually get?)
3. Use insights for General's Tent review
4. Adjust next week's Focus/Fire based on results

---

## Integration with Other Centres

### VOICE Centre
- Fruits = **SUBMIT phase** (4 Fs)
- Daily questions help you stay radically honest about results
- "What results have you gotten from this mindset?"

### GAME Centre
- Fruits data feeds into **TENT** (Weekly Review)
- Results inform course corrections
- Fruit tracking shows if Fire Map strikes are working

### CORE4 Centre
- Fruits can track Core4 completion
- "Did you hit your 4 points today?" = Fruit question
- Results = accountability

---

## Related Documentation

- [VOICE_CENTRE_RESTRUCTURED.md](VOICE_CENTRE_RESTRUCTURED.md) - Mental Mastery (STOP→SUBMIT→STRUGGLE→STRIKE)
- [GAME_CENTRE_RESTRUCTURED.md](GAME_CENTRE_RESTRUCTURED.md) - Strategic Maps (includes Tent review)
- [CORE4_CENTRE_RESTRUCTURED.md](CORE4_CENTRE_RESTRUCTURED.md) - Daily Habits
- [gas/README.md](../gas/README.md) - GAS HQ full docs
- [node/README.md](../node/README.md) - Node.js server docs
- [AlphaOS-THE-VOICE.md](~/Dokumente/AlphaOs-Vault/ALPHA_OS/AlphaOS-THE-VOICE.md) - Elliott Hulse Blueprint (Chapter 21 - Submit)

---

**Last Updated:** 2026-01-10
**AlphaOS Philosophy:** Elliott Hulse (THE VOICE - Chapter 21 - Submit - 4 Fs)
**Implementation Status:** ✅ GAS (Full) | ✅ Node.js (Questions + Storage) | ⏳ Python/CLI
