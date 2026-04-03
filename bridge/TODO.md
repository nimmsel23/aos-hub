# Bridge — TODO

## Documentation

- [ ] **CHANGELOG maintenance:** Always update both `bridge/CHANGELOG.md` and `~/aos-hub/CHANGELOG.md` before committing
  - Component CHANGELOG gets detailed changes
  - Repository CHANGELOG gets one-line summary
  - See: `CLAUDE.md` → Version Control section
  - See: `~/aos-hub/CHANGELOG.md` for format

## Features

- [ ] Add selftest.py for automated testing
- [ ] Add more helper scripts to `lib/` directory
- [ ] Document all endpoints in AGENTS.md
- [ ] Add monitoring/metrics endpoint

## Technical Debt

- [ ] **Python wrapper optimization:** Replace bash wrapper calls with direct Python imports
  - [ ] `_run_firectl_print()` → call `firebot.py` directly instead of via `firectl` bash wrapper
  - [ ] Remove intermediate bash layer: Bridge → firectl (bash) → firebot.py
  - [ ] Pattern: tracker.py now called directly (not via core4ctl), firebot.py should be same
  - [ ] Benefit: Remove subprocess overhead, direct Python integration
- [ ] Review error handling in all handlers
- [ ] Add structured logging for all operations
- [ ] Consider splitting app.py into modules if >1000 lines

## See Also

- `AGENTS.md` — Component patterns and gotchas
- `CLAUDE.md` — Development guidelines
- `CHANGELOG.md` — Component change history
- `~/aos-hub/CHANGELOG.md` — Repository changelog
