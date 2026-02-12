# αOS Hub — Doc System (SSOT)

The repo accumulated many overlapping docs from multiple assistant sessions. This file defines the **single source of truth (SSOT)** going forward.

## Rule #1: Pillar roots own their docs

For each pillar/centre root (e.g. `core4/`, `door/`, `voice/`, `game/`) the SSOT docs live **directly in that folder**:

- `README.md` — entry + “what is it” + quickstart
- `ARCHITECTURE.md` — mental model + invariants + writers/readers + safety rules + runbook
- `CHEATSHEET.md` — commands/URLs/env vars
- `CHANGELOG.md` — short, actionable change history

If information exists elsewhere, update the pillar docs and link out (don’t duplicate new prose in two places).

## Rule #2: `DOCS/` is a portal + archive

- `DOCS/overview.md` and friends should **link to the pillar SSOT docs**.
- Old/one-off session docs go to `DOCS/archive/`.
- Avoid creating new `DOCS/<pillar>.md` “competing” files.

## Rule #3: Prefer one “mental model” per system

When a pipeline has multiple writers/readers (Core4/Door/Game/Fire), keep **one** architecture doc as the mental model and link to it from other READMEs.

