# AOS Hub Documentation Index

This is the frontdoor for docs.

Primary development target:
- `index-node` (local HQ, APIs, centre UIs)

Alternative runtime:
- `gas` (cloud runtime, can diverge by centre and feature)

## Session Start (Recommended)

1. Read `../index-node/README.md` for current runtime and local commands.
2. Open `node/INDEX.md` for centre-level node docs.
3. If needed, open `gas/INDEX.md` for cloud behaviour and current gaps.
4. For cross-runtime alignment work, follow `ALIGNMENT_INDEXNODE_GAS.md`.

## Core Navigation

- Primary docs: `node/INDEX.md`
- Alternative runtime docs: `gas/INDEX.md`
- Centre summary: `centres.md`
- Legacy architecture notes: `README.md`

## Operating Model

- Build and evolve features first in `index-node`.
- Align selected features to `gas` only when operationally needed.
- Track parity by centre and mark each item as:
  - `green` = implemented and verified in both
  - `yellow` = partial or behavior mismatch
  - `red` = node-only or not aligned
