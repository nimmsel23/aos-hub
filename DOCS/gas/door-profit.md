# Door Profit (GAS HQ) – Concept & Checks

## Scope
- Capture weekly Door Profit reflection (Achieved & Done).
- Store as JSON in `Alpha_Door/4-Profit/door_profit_<date>.json`.
- (In extended flow) mark Profit task done & annotate (after War Stack/Production).

## Entry Points (current)
- Profit panel in Door Centre (if wired) calling `door_saveProfitJson_`.
- Direct GAS call to `door_saveProfitJson_(data)` with payload:
  - date (default today), door_opened (y/n), door_obstacle, hits[], done[], insight, lesson.

## Storage
- JSON in `Alpha_Door/4-Profit` via `door_saveProfitJson_`.
- (Future) Markdown export can be added similar to War Stack if needed.

## JSON Structure (required)
```json
{
  "date": "YYYY-MM-DD",
  "week": "YYYY-WWW",
  "door_opened": true,
  "door_obstacle": "optional text if door_opened = false",
  "hits": [
    { "hit": "Hit 1", "done": true, "notes": "" }
  ],
  "done": ["other completed tasks..."],
  "insight": "string",
  "lesson": "string",
  "score": {
    "big_rocks_total": 4,
    "big_rocks_done": 3,
    "execution_percent": 75
  }
}
```

## Taskwarrior Completion Flow (optional)
- Find Profit task for current Door (by UUID in War Stack frontmatter or by tag `+profit` + project).
- Mark done in Taskwarrior via Bridge.
- Annotate with a summary line (insight + lesson).
  (Current Bridge supports `task modify` only; done/annotation require bridge upgrade.)

## Optional Markdown Export (Obsidian)
- Generate `door_profit_<date>.md` in `Alpha_Door/4-Profit`.
- Sections: Door opened?, Achieved Hits, Done list, Insight, Lesson.
  (MD export can mirror JSON for human review.)

## Props (expected)
- Alpha_Door folder (resolved via `door.gs`).
- No TickTick/Bridge dependency unless we hook Profit task completion.

## Smoke Checks
1) Save Profit JSON: creates/updates file in `4-Profit`, fields persisted.
2) Read-back (manual): open file and verify content.

## Open Items
- Hook into Taskwarrior: mark Profit task done + annotate reflection.
- Optional Markdown export in addition to JSON.
- Link Profit view to War Stack/Hit completion for context.
