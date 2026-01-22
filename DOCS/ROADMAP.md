# αOS Hub Roadmap

A living roadmap for the αOS ecosystem. Focus is on stability, data flow, and clear separation between HQ (daily) and Tent (weekly).

## Now (Stabilize)

- Solidify HQ UI: inline centres (Maps, Fruits, Voice) + external dots from Script Properties.
- Core4 tracker: 8 habits/day, 4 points/day, weekly JSON in `Alpha_Core4` + summary export to `Alpha_Tent`.
- Hot List: sheet logging + Door `.md` + optional TickTick sync (inbox fallback).
- Fix link wiring: script property map, matrix grid, terminal commands.

## Next (Data Flow)

- Make HQ terminal commands call real GAS actions (links + logging).
- Ensure Tent pulls weekly summaries and stays Sunday-only.
- Harden Vault sync: safe pull on boot, push on shutdown, conflict backup.
- Standardize centre data formats (Fruits, Door, Game, Voice) for Obsidian/GDrive.

## Soon (Automation)

- Telegram weekly Core4 summary + Tent export at Sunday trigger.
- Door/Game centres writing to Vault + Task/TickTick pipelines.
- Voice history: read and render markdown logs, open/read in UI.

## Later (Scale)

- Multi-user support (user-based logs + segregation).
- Dashboards: weekly scoreboards, habit streaks, trend views.
- Offline-first caching for HQ UI and centres.
