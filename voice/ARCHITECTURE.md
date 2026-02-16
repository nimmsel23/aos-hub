# Voice — Architecture

This is the source-of-truth “mental model” for the Voice pillar inside `aos-hub/`.

## What Voice is

Voice is the **mental mastery capture system** using a fixed 4-step facilitation:

**STOP → SUBMIT → STRUGGLE → STRIKE**

## Invariants (do not break)

- **One source of truth for session discovery/templates:** `voice/lib/*` (used by CLI and future API).
- **Session files are append-only user content:** tools may add metadata, but must not destructively rewrite.
- **Graceful UI fallbacks:** gum/glow/bat/cat are optional; CLI must still work.

## Data model

- One markdown file per session (sortable IDs by timestamp).
- Stable ID scheme: `VOICE-YYYY-MM-DD_HHMM.md`.

## Components in this repo

- `voice/lib/` — listing/search/template helpers
- `voice/cli/voicectl` — terminal UI
- `index-node/` — Voice UI (reads the same vault/session set)

## Debug / Runbook

```bash
voicectl list 20
voicectl search "pattern"
voicectl stats
voicectl strike <id>
```

## Where docs live

- Entry: `voice/README.md`
- Commands: `voice/CHEATSHEET.md`
- Changes: `voice/CHANGELOG.md`

