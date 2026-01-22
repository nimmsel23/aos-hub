# Changelog

## Unreleased
- Validate core4 points inputs and ignore invalid stored values when computing totals.
- Guard tent summary file writes to stay inside AOS_TENT_DIR.
- Validate task execute payload shape to avoid crashes on non-dict entries.
- Return JSON errors when task or rclone binaries are missing.
- Accept numeric timestamp strings in _parse_ts.
- Add GAS sync push helper + Telegram /push command, and add bridgectl sync push/pull commands.
- Add bridgectl gum menu with syncvaultctl entrypoints.
