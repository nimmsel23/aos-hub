# gas-door-dev

Standalone Apps Script project for the Door Centre (dev split-out from `gas/`).

## Goal
- Keep the **solo GAS HQ** home page smaller (remove the inline Door War matrix there).
- Maintain Door War / War Stack inside this standalone deployment.

## Multi-user model (Standalone)
- WebApp uses a per-user key: `...?k=<user_key>`
- On first visit without `k`, the client calls `door_registerAnonUser()` and redirects to a key URL.
- Drive writes go under `Alpha_Door/Users/<user_key>/...` (still the script owner’s Drive).
- Side effects (Bridge/TickTick/Telegram) are **disabled by default** and require opt-in script properties:
  - `DOOR_STANDALONE_ALLOW_SIDE_EFFECTS=1`
  - `DOOR_PRIVILEGED_USER_KEYS=<comma-separated user keys>`

## Setup (clasp)
From repo root:

- `cd gas-door-dev`
- `clasp create --type standalone --title "αOS Door (Dev)" --rootDir .`
- `clasp push -f`

Then deploy as Web App in the Apps Script UI.
