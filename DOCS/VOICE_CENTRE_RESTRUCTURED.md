# Voice Centre Documentation

**VOICE Sessions** - Mental Mastery (Part of THE VOICE)

**Last Updated:** 2026-01-10

---

## AlphaOS Philosophy: What MUST Be

> "STOP → SUBMIT → STRUGGLE → STRIKE" — Elliott Hulse

### Purpose

**Pattern Interruption + Narrative Rewriting** - Mental mastery through 4-step process.

---

## What MUST Happen

### THE 4-STEP PROCESS

1. **STOP** - Interrupt destructive patterns
2. **SUBMIT** - Face truth, surrender
3. **STRUGGLE** - Rewrite stories, face resistance
4. **STRIKE** - Take decisive action

**Outcome:** DOMINION over your own thoughts. Without VOICE, you're slave to your patterns.

---

## Implementation: What IS

### Multi-Platform Status

| Component | GAS | Node.js | Python/CLI |
|-----------|-----|---------|------------|
| **VOICE Sessions** | ✅ Active | ✅ Active | ⏳ Missing |
| **History/Search** | ✅ Active | ✅ Active | ⏳ Missing |
| **Autosave** | ✅ Active | ✅ Active | ⏳ Missing |

---

### GAS Implementation

#### Entry
- **Backend:** `gas/voice.gs`
- **UI:** HQ panel or dedicated page

#### Storage
- **Drive Folder:** `Alpha_Voice`
- **Format:** Markdown files with frontmatter

#### Features
- Session capture with 4-step structure
- Phase tracking (Stop/Submit/Struggle/Strike)
- History view
- Telegram integration

---

### Node.js Implementation

#### Entry
- **UI:** `http://127.0.0.1:8799/voice`

#### Storage
- **Vault:** `~/Voice` (preferred) OR `~/AlphaOS-Vault/VOICE`
- **Format:** Markdown files with metadata

#### API (Node.js Endpoints)

**Session Management:**
```bash
POST /api/voice/export           # Save session markdown
POST /api/voice/autosave         # Auto-save draft
```

**Retrieval:**
```bash
GET /api/voice/history?limit=50  # Recent sessions
GET /api/voice/file?path=relative/path.md  # Load specific session
```

#### Environment Variables
```bash
VOICE_VAULT_DIR    # Default: auto-detect (~/Voice or ~/AlphaOS-Vault/VOICE)
```

#### Features
- Local session capture
- File history browsing
- Autosave support (draft recovery)
- Vault integration (Obsidian-compatible)

---

## Data Flow (Complete System)

### GAS Flow
```
User → HQ VOICE panel
    ↓
voice.gs → saveSession()
    ↓
Save to Drive: Alpha_Voice/VOICE_Session_YYYY-MM-DD.md
    ↓
Optional: Telegram notification
```

### Node.js Flow
```
User → http://127.0.0.1:8799/voice
    ↓
POST /api/voice/export (session markdown)
    ↓
Save to: ~/Voice/VOICE_Session_YYYY-MM-DD.md
    ↓
Return: { ok: true, path: "..." }
```

### History Retrieval
```
GET /api/voice/history?limit=50
    ↓
Scan: VOICE_VAULT_DIR
    ↓
Return: [
  { filename: "...", date: "...", path: "..." },
  ...
]
```

---

## Related Documentation

- [DOOR_CENTRE_RESTRUCTURED.md](DOOR_CENTRE_RESTRUCTURED.md) - Weekly Tactics (4P Flow)
- [GAME_CENTRE_RESTRUCTURED.md](GAME_CENTRE_RESTRUCTURED.md) - Strategic Maps
- [CORE4_CENTRE_RESTRUCTURED.md](CORE4_CENTRE_RESTRUCTURED.md) - Daily Habits
- [gas/README.md](../gas/README.md) - GAS HQ full docs
- [node/README.md](../node/README.md) - Node.js server docs

**Related Agent:**
- **voice-pillar-agent** - AlphaOS agent for VOICE facilitation (interactive sessions via Claude Code)

---

**Last Updated:** 2026-01-10
**AlphaOS Philosophy:** Elliott Hulse (THE VOICE - Pillar #3)
**Implementation Status:** ✅ GAS (Full) | ✅ Node.js (Session capture + History) | ⏳ Python/CLI
