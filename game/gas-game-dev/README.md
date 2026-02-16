# gas-game-dev

Standalone Google Apps Script project for the Game Centre (Frame/Freedom/Focus/Fire).

## Goal

- One WebApp deployment for everyone (multi-user) via anonymous workspace keys (`?k=...`).
- No dependency on your local Index Node APIs (all storage in Google Drive).

## Storage Model (Drive)

- Base folder: `Alpha_Game_Standalone`
- Per-user workspaces:
  - `Alpha_Game_Standalone/Users/<userKey>/Frame`
  - `Alpha_Game_Standalone/Users/<userKey>/Freedom`
  - `Alpha_Game_Standalone/Users/<userKey>/Focus`
  - `Alpha_Game_Standalone/Users/<userKey>/Fire`

## Debug endpoints
- `...?action=health[&k=...]` returns JSON with base folder + base URL.
- `...?action=register` returns JSON `{userKey, shareUrl}` (creates a new workspace key).

## Setup (clasp)

From repo root:

- `cd gas-game-dev`
- `clasp create --type standalone --title "αOS Game (Dev)" --rootDir .`
- `clasp push -f`

Then deploy as Web App in the Apps Script UI:
- Execute as: **Me**
- Who has access: **Anyone**
