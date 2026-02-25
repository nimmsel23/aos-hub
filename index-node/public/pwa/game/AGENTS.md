# Game PWA — Agent Guidelines

**Codex Handle:** `codex-game-forge`
**Coordinated by:** `claude-fire-forge` (main Claude Code session)
**Purpose:** Build backend APIs for Game PWA (strategic maps cascade)

## Architecture

**Game PWA** = Strategic navigation through the Map cascade:
- **FRAME** (Where am I now?) — Current reality snapshot
- **FREEDOM** (10-Year IPW) — Ideal Parallel World vision
- **FOCUS** (Monthly Mission) — Monthly execution plan
- **FIRE** (Weekly 4×4) — Weekly strikes (already exists)

**Frontend:** COMPLETE (built by claude-fire-forge)
- Location: `public/pwa/game/index.html` + `app.js` + `style.css`
- Top Nav: FRAME/FREE/FOCUS/FIRE tabs
- Content: 4 domain cards (BODY/BEING/BALANCE/BUSINESS) per map
- Bottom Nav: CORE | GAME | DOOR | SCORE

**Backend:** YOUR JOB
- Location: `routes/game.js` (to be created)
- APIs: FRAME/FREEDOM/FOCUS endpoints
- Storage: `~/.aos/{frame,freedom,focus}/`

## Your Responsibilities

### 1. Build `routes/game.js`

Create Express router with these endpoints:

**FRAME API:**
- `GET /api/game/frame/domains` → all 4 domains (preview + timestamp)
- `GET /api/game/frame/:domain` → full markdown
- `POST /api/game/frame/:domain/save` → save + update frontmatter

**FREEDOM API:**
- `GET /api/game/freedom/year` → current year (4 domains)
- `GET /api/game/freedom/:year/:domain` → markdown for year+domain
- `POST /api/game/freedom/:year/:domain/save` → save

**FOCUS API:**
- `GET /api/game/focus/month` → current month (4 domains)
- `GET /api/game/focus/:month/:domain` → markdown for month+domain (YYYY-MM)
- `POST /api/game/focus/:month/:domain/save` → save

**FIRE API:**
- Already exists at `routes/fire.js` — DO NOT MODIFY

### 2. Storage Pattern

**Base:** `~/.aos/`

**FRAME:**
```
~/.aos/frame/
├── body.md
├── being.md
├── balance.md
└── business.md
```

**FREEDOM:**
```
~/.aos/freedom/
├── 2025/
│   ├── body.md
│   ├── being.md
│   ├── balance.md
│   └── business.md
├── 2026/
│   └── ...
```

**FOCUS:**
```
~/.aos/focus/
├── 2026-01/
│   ├── body.md
│   └── ...
├── 2026-02/
│   └── ...
```

### 3. Frontmatter Format

Use `js-yaml` to parse/write frontmatter.

**FRAME:**
```yaml
---
domain: BODY
updated: 2026-02-24
type: frame-map
tags: [alphaos, frame, body]
---

# FRAME: BODY

[Markdown content here]
```

**FREEDOM:**
```yaml
---
domain: BODY
year: 2026
horizon: 10-year
type: freedom-map
tags: [alphaos, freedom, body, ipw]
---

# FREEDOM: BODY (2026-2036)

[Markdown content here]
```

**FOCUS:**
```yaml
---
domain: BODY
month: 2026-02
type: focus-map
tags: [alphaos, focus, body, monthly]
---

# FOCUS: BODY (February 2026)

[Markdown content here]
```

## Constraints

### DO
✅ Build `routes/game.js` with all FRAME/FREEDOM/FOCUS APIs
✅ Mount router in `server.js`: `app.use("/api/game", gameRouter);`
✅ Auto-create directories (`fs.mkdirSync(..., { recursive: true })`)
✅ Parse/write YAML frontmatter correctly
✅ Return JSON: `{ ok: true/false, data/error }`
✅ Set git identity: `git config user.name "codex-game-forge"` before commits

### DO NOT
❌ Modify `routes/fire.js` (complete, owned by claude-fire-forge)
❌ Touch frontend files (`public/pwa/game/*`) without asking
❌ Change other routes (`routes/door.js` is handled by codex-door-forge)
❌ Commit without setting git identity first

## Coordination Protocol

**Report to claude-fire-forge:**
- When routes are complete and tested
- If you encounter blockers (missing dependencies, unclear specs)
- Before making changes outside `routes/game.js`

**Ask claude-fire-forge:**
- If API design is ambiguous
- If storage patterns conflict with existing code
- If you need clarification on frontmatter structure

## Testing

**Smoke Test:**
```bash
cd ~/aos-hub/index-node
npm run dev

# In another terminal:
curl http://127.0.0.1:8799/api/game/frame/domains | jq
curl http://127.0.0.1:8799/api/game/frame/body | jq
curl http://127.0.0.1:8799/api/game/freedom/2026/body | jq
curl http://127.0.0.1:8799/api/game/focus/2026-02/body | jq
```

**Expected:**
- All endpoints return `{ ok: true }`
- Missing files auto-create with default frontmatter
- POST endpoints update frontmatter correctly

## Success Criteria

1. ✅ `routes/game.js` exists with all endpoints
2. ✅ All routes return proper JSON
3. ✅ Storage directories auto-create
4. ✅ Frontmatter parsing works
5. ✅ `server.js` mounts the router
6. ✅ Smoke tests pass
7. ✅ Git commits use `codex-game-forge` identity

## File Structure

```
index-node/
├── routes/
│   ├── fire.js          (complete, don't touch)
│   └── game.js          (YOUR JOB)
├── server.js            (add router mount)
└── public/pwa/game/     (frontend, complete)
```

---

**Start:** Read the full prompt at `~/.agents/codex-prompts/javascript/game-pwa-backend.md` and build `routes/game.js`.
