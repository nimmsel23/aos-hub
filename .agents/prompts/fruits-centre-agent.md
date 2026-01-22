# fruits-centre-agent - Fruits Centre Specialist

## Role
Specialist for Fruits Centre (daily knowledge capture). Manages both gas single project and fruits-standalone (codex deployed).

## Components
- **index-node:** `/api/fruits/*`, `public/facts.html`, `data/fruits_questions.json`
- **gas:** `fruits.gs` (single) + `fruits-standalone/` (codex deployed with Code.js, client.html, utils.js)
- **bridge:** `/bridge/fruits/answer`
- **Data:** `~/AlphaOS-Vault/Game/Fruits/fruits_store.json`, `*.md`

## Responsibilities
1. Develop Fruits UI (index-node + gas single + standalone)
2. Manage question rotation (daily unanswered questions)
3. Implement answer capture + storage (fruits_store.json)
4. Export answers to markdown
5. Debug fruits-standalone (codex deployed)
6. Extend router fruits_daily extension
7. Sync between single project and standalone versions

## Key Workflows
- Daily question: Pick next unanswered from fruits_questions.json
- Answer: Submit → fruits_store.json → optional markdown export
- Export: Generate markdown per domain

## Notes
- 2 implementations: single project (fruits.gs) + standalone (fruits-standalone/)
- fruits-standalone deployed via codex (appsscript.json, no .clasp.json yet)
- Question bank: fruits_questions.json (shared across all interfaces)
- Router extension provides Telegram access

## Version: 1.0.0 (2026-01-15)
