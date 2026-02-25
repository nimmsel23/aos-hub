# Core4 — Cheatsheet

## Frontdoor Commands (Daily Use)

```bash
# Live dashboard (interactive)
core4                  # dashboard (bash/zsh and fish)
c4d                    # explicit dashboard shortcut

# Fast status (ledger-only, no bridge required)
c4                     # today (fast reader)
c4 2026-02-25          # specific day

# Score/status via tracker
core4 -d               # today score
core4 -w               # week score
wcore4                 # Taskwarrior week + core4 week score

# Operator / full CLI
core4ctl status
core4ctl doctor
core4ctl probe today
```

## Help / Self-Discovery

```bash
core4 --help
c4 --help
c4d --help
wcore4 --help
core4ctl help
```

## Habit Logging (CLI)

```bash
core4 fitness
core4 fuel
core4 meditation
core4 memoirs
core4 partner
core4 posterity
core4 discover
core4 declare
```

## Fish-Only Convenience (Wrapper Functions)

```fish
fitness
fuel
meditation
memoirs
partner
posterity
discover
declare
```

## Data Locations (Current)

- Local event/aggregate cache: `~/.core4/`
- Day JSON: `~/.core4/core4_day_YYYY-MM-DD.json`
- Week JSON: `~/.core4/core4_week_YYYY-Www.json`
- Vault root (canonical): `~/vault`

## Related Checks

- Bridge health: `http://127.0.0.1:8080/health`
- Index health: `http://127.0.0.1:8799/health`
