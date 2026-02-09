# Codex Sessions (Fish Shortcuts + Git Branch Hygiene)

Goal: keep each Codex session on its own git branch, so `resume` always shows the correct branch.

## Workflow (recommended)

1) Create a per-session branch from the right centre base branch:

```bash
scripts/codexsess new game multiuser-drive
scripts/codexsess new tent telegram-mapping
scripts/codexsess new node focus-saved-maps
```

This will:
- switch to the base branch (`centre/game-standalone`, etc.)
- create a session branch (`sess/<centre>/<slug>-YYYYMMDD-HHMM`)
- add a fish-friendly shell alias via `scripts/aos-aliasctl`:
  - `cx_<centre>_<slug>` -> `cd /home/alpha/aos-hub && git switch <branch>`

2) Start the Codex session from that branch.

3) Later, jump back instantly:

```fish
cx_game_multiuser_drive
```

## One-off shortcuts

If you just want a quick shortcut to an existing branch:

```bash
scripts/codexsess alias syncctl main
```

Creates:
- `cx_syncctl` -> switch to `main`

## Notes

- Shortcuts are managed by `scripts/aos-aliasctl` and live in `~/.config/shell-aliases/`.
- fish loads them via `~/.config/fish/conf.d/shell-aliases.fish` (symlink).

