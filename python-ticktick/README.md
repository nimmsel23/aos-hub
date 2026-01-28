# Core4 TickTick Sync

Unified sync helper for Core4 between Taskwarrior and TickTick.

## Commands

- Add (from Taskwarrior hook):
  - `ticktick_sync.py --stdin`
- Daily sync + reminder:
  - `ticktick_sync.py --sync --tele --gemini`
- Push Taskwarrior completions to TickTick:
  - `ticktick_sync.py --push`
- Status only:
  - `ticktick_sync.py --status`

## Environment

- `TICKTICK_TOKEN`
- `CORE4_TICKTICK_PROJECT_ID` (optional)
- `CORE4_TELE=1` to enable tele reminders
- `GEMINI_API_KEY` (optional, for `--gemini`)
- `GEMINI_MODEL` (default: `gemini-2.5-flash`)
- `CORE4_TICKTICK_COMPLETE_ENDPOINT` (optional)

## Mapping

Mapping file lives in:

```
~/AlphaOS-Vault/.alphaos/core4_ticktick_map.json
```

A symlink is created to:

```
~/.local/share/alphaos/core4_ticktick_map.json
```
