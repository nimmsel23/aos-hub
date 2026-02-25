# Door PWA — Agent Guidelines

**Codex Handle:** `codex-door-forge`
**Coordinated by:** `claude-fire-forge` (main Claude Code session)
**Purpose:** Build backend APIs for Door PWA (4P Flow: Potential → Plan → Production → Profit)

## Architecture

**Door PWA** = Weekly tactics execution through the 4P Flow:
- **POTENTIAL** — Hot List (capture ideas)
- **PLAN** — Door War (Eisenhower Matrix) + War Stack creation
- **PRODUCTION** — Hit List (4 Hits execution)
- **PROFIT** — Review & Reflection

**Frontend:** COMPLETE (built by claude-fire-forge)
- Location: `public/pwa/door/index.html` + `app.js` + `style.css`
- Bottom Nav: POTENTIAL | PLAN | PRODUCTION | PROFIT tabs
- Content: Phase-specific UI (currently with placeholder data)

**Backend:** YOUR JOB
- Location: `routes/door.js` (to be created)
- APIs: Hot List, Door War, War Stack, Hits, Reflections
- Storage: `~/.aos/door-flow.json` + `~/AlphaOS-Vault/Door/`

## Your Responsibilities

### 1. Build `routes/door.js`

Create Express router with these endpoints:

**POTENTIAL API (Hot List):**
- `GET /api/door/hotlist` → all items
- `POST /api/door/hotlist` → add item
- `DELETE /api/door/hotlist/:id` → remove item

**PLAN API (Door War + War Stack):**
- `POST /api/door/doorwar` → run Eisenhower Matrix, select Domino Door
- `GET /api/door/warstacks` → list War Stacks
- `POST /api/door/warstack/start` → start new War Stack (returns session_id + first question)
- `POST /api/door/warstack/answer` → submit answer, get next question
- `GET /api/door/warstack/:id` → fetch completed War Stack

**PRODUCTION API (Hit List):**
- `GET /api/door/hits` → all active Hits (from current week War Stacks)
- `POST /api/door/hits/:id/toggle` → toggle hit completion
- `GET /api/door/hits/week` → weekly summary

**PROFIT API (Review):**
- `GET /api/door/completed` → list completed Doors
- `POST /api/door/reflection` → save reflection markdown
- `GET /api/door/reflections` → list reflections

### 2. Storage Pattern

**Flow State:** `~/.aos/door-flow.json`
```json
{
  "hotlist": [
    {
      "id": "uuid",
      "title": "Vitaltrainer Ausbildung",
      "description": "...",
      "created_at": "2026-02-24T10:00:00Z",
      "quadrant": 2
    }
  ],
  "doorwars": [...],
  "warstacks": [...],
  "hits": [...]
}
```

**Vault Markdown:** `~/AlphaOS-Vault/Door/`
```
~/AlphaOS-Vault/Door/
├── War-Stacks/
│   ├── 2026-W08/
│   │   └── Vitaltrainer_Ausbildung.md
│   └── 2026-W09/
│       └── ...
└── 4-Profit/
    ├── 2026-02-24_reflection.md
    └── ...
```

### 3. War Stack Flow (Multi-Step)

War Stack creation is **conversational** (4 inquiry steps + auto-generate 4 hits):

**Step 1:** `POST /warstack/start { door_title }`
```json
{ "ok": true, "session_id": "uuid", "step": "trigger", "question": "Was ist der Auslöser?" }
```

**Step 2-4:** `POST /warstack/answer { session_id, step, answer }`
- `trigger` → ask `narrative`
- `narrative` → ask `validation`
- `validation` → ask `impact`
- `impact` → **generate 4 hits** (auto-filled, user can edit) → save markdown

**Final Response:**
```json
{
  "ok": true,
  "warstack": {
    "id": "uuid",
    "door_title": "Vitaltrainer Ausbildung",
    "inquiry": { "trigger": "...", "narrative": "...", "validation": "...", "impact": "..." },
    "hits": [ { "fact": "...", "obstacle": "...", "strike": "...", "responsibility": "..." }, ... ],
    "created_at": "2026-02-24T10:00:00Z",
    "markdown_path": "~/AlphaOS-Vault/Door/War-Stacks/2026-W08/Vitaltrainer_Ausbildung.md"
  }
}
```

### 4. War Stack Markdown Format

```markdown
# War Stack: Vitaltrainer Ausbildung

**Week:** 2026-W08
**Created:** 2026-02-24
**Domain:** BUSINESS

## Reflexive Inquiry

**Trigger:** Was hat dich hierher gebracht?
> [Answer]

**Narrative:** Welche Geschichte erzählst du dir?
> [Answer]

**Validation:** Was ist wirklich wahr?
> [Answer]

**Impact:** Was wird sich ändern wenn du das durchziehst?
> [Answer]

---

## 4 Hits (Fact / Obstacle / Strike / Responsibility)

### Hit 1
- **Fact:** Modul 3 abschließen
- **Obstacle:** Zeitmangel wegen Nebenjob
- **Strike:** 2h täglich Lernblock vor Arbeit
- **Responsibility:** Ich bin verantwortlich für meine Priorisierung

### Hit 2
[...]

### Hit 3
[...]

### Hit 4
[...]
```

## Constraints

### DO
✅ Build `routes/door.js` with all Hot List/War Stack/Hits/Reflection APIs
✅ Mount router in `server.js`: `app.use("/api/door", doorRouter);`
✅ Persist flow state to `~/.aos/door-flow.json`
✅ Export War Stacks to markdown in `~/AlphaOS-Vault/Door/War-Stacks/`
✅ Return JSON: `{ ok: true/false, data/error }`
✅ Set git identity: `git config user.name "codex-door-forge"` before commits

### DO NOT
❌ Modify `routes/fire.js` or `routes/game.js` (other sessions)
❌ Touch frontend files (`public/pwa/door/*`) without asking
❌ Change Vault structure without confirming with claude-fire-forge
❌ Commit without setting git identity first

## Coordination Protocol

**Report to claude-fire-forge:**
- When routes are complete and tested
- If War Stack flow logic is unclear
- Before making changes outside `routes/door.js`

**Ask claude-fire-forge:**
- If Hot List vs Taskwarrior integration is needed
- If War Stack markdown format should match existing patterns
- If you need clarification on Eisenhower Matrix logic

## Testing

**Smoke Test:**
```bash
cd ~/aos-hub/index-node
npm run dev

# In another terminal:
curl http://127.0.0.1:8799/api/door/hotlist | jq

curl -X POST http://127.0.0.1:8799/api/door/hotlist \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Door"}' | jq

curl -X POST http://127.0.0.1:8799/api/door/warstack/start \
  -H "Content-Type: application/json" \
  -d '{"door_title":"Vitaltrainer"}' | jq
```

**Expected:**
- All endpoints return `{ ok: true }`
- Flow state persists to `~/.aos/door-flow.json`
- War Stack markdown exports to Vault correctly

## Success Criteria

1. ✅ `routes/door.js` exists with all endpoints
2. ✅ Hot List CRUD works
3. ✅ War Stack multi-step flow works
4. ✅ Markdown export to Vault works
5. ✅ `server.js` mounts the router
6. ✅ Smoke tests pass
7. ✅ Git commits use `codex-door-forge` identity

## File Structure

```
index-node/
├── routes/
│   ├── fire.js          (complete, don't touch)
│   ├── game.js          (handled by codex-game-forge)
│   └── door.js          (YOUR JOB)
├── server.js            (add router mount)
└── public/pwa/door/     (frontend, complete)
```

---

**Start:** Read the full prompt at `~/.agents/codex-prompts/javascript/door-pwa-backend.md` and build `routes/door.js`.
