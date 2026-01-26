# CTL Script Guidelines

## Overview

All `*ctl` scripts in aos-hub follow consistent patterns for UX and structure.

**Examples:** `routerctl`, `bridgectl`, `tentctl`, `firectl`, `core4ctl`

## Naming Convention

- **Pattern:** `<component>ctl` (no dashes)
- **Location:** Component directory or `scripts/`
- **Permissions:** Executable (`chmod +x`)

## UI Framework

**REQUIRED:** Use `gum` or `fzf` for interactive UI elements.

### Why gum/fzf?

- Consistent UX across all ctl scripts
- Beautiful, intuitive interfaces
- Graceful fallback when not installed

### Which to use?

**Both are acceptable!**

- **gum** - UI framework (borders, prompts, styles)
  - Used by: `routerctl`, `bridgectl`, `tentctl`
  - Better for: Status displays, confirmations, styled output

- **fzf** - Fuzzy finder (selection menus)
  - Used by: `firectl`
  - Better for: Long lists, fuzzy search, file selection

**Best practice:** Use both together!
- `fzf` for selection menus (`ui_choose`)
- `gum` for UI elements (`ui_title`, `ui_ok`, etc.)
- Always provide fallback for when neither is installed

### UI Helper Functions

All ctl scripts MUST include these helpers:

```bash
has_gum() { command -v gum >/dev/null 2>&1; }
has_fzf() { command -v fzf >/dev/null 2>&1; }

ui_title()   # Title banner (gum style --border)
ui_info()    # Faint info text
ui_ok()      # Green success (✔)
ui_err()     # Red error (✘)
ui_warn()    # Yellow warning (⚠)
ui_confirm() # Yes/No prompt
ui_input()   # Text input
ui_choose()  # Menu selection (fzf > gum > select fallback)
```

**See:** `scripts/ctl-template.sh` for complete implementation

## Standard Commands

Every ctl script SHOULD support:

```
start      Start the component/service
stop       Stop the component/service
restart    Restart
status     Show current status
logs       Show logs (if applicable)
doctor     Health check / diagnostics
version    Show version
menu       Interactive menu (gum required)
help       Show help text
```

Additional commands as needed for specific components.

## Structure Template

```bash
#!/usr/bin/env bash
set -euo pipefail

# Header (name, version, description)
COMPONENTCTL_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"

# Configuration (paths, env vars)

# UI Helpers (gum/fzf functions)

# Commands (cmd_start, cmd_stop, etc.)

# Main dispatcher (case statement)

main "$@"
```

**Full template:** `scripts/ctl-template.sh`

## Examples from Existing Scripts

### routerctl (Reference Implementation)

- ✅ gum UI helpers
- ✅ Systemd service management
- ✅ Menu command (interactive)
- ✅ Doctor command (diagnostics)
- ✅ Heartbeat module (sub-commands)

**Pattern:**
```bash
routerctl start
routerctl status
routerctl menu
routerctl heartbeat status
```

### bridgectl

- ✅ gum UI
- ✅ Health checks
- ✅ Service control
- ✅ Debug commands

### tentctl

- ✅ gum UI
- ✅ GAS deployment (clasp)
- ✅ Webhook management
- ✅ Test commands

## Integration with aosctl

All component ctl scripts can be wrapped in `aosctl`:

```bash
# In aosctl
COMPONENTCTL="$(resolve_bin "$SCRIPT_DIR/path/to/componentctl" || true)"

# In route_component() or specific cmd function
component)
  [[ -n "$COMPONENTCTL" ]] || die "componentctl not found"
  "$COMPONENTCTL" "$@"
  ;;
```

**See:** `aosctl` for `tent` integration example

## Best Practices

### 1. Always Use UI Helpers

**Bad:**
```bash
echo "Starting service..."
echo "Error: Failed to start"
```

**Good:**
```bash
ui_info "Starting service..."
ui_err "Failed to start"
```

### 2. Graceful Fallbacks

```bash
# Prefer fzf > gum > builtin select
ui_choose() {
  if has_fzf; then
    printf '%s\n' "${options[@]}" | fzf --prompt="$prompt > "
  elif has_gum; then
    gum choose --header="$prompt" "${options[@]}"
  else
    select opt in "${options[@]}"; do
      echo "$opt"
      return
    done
  fi
}
```

### 3. Error Handling

```bash
set -euo pipefail  # Strict mode
trap 'ui_err "Failed at line $LINENO"; exit 1' ERR
```

### 4. Help Text

Always include:
- Usage examples
- Command descriptions
- Installation hints for dependencies

### 5. Version Info

```bash
COMPONENTCTL_VERSION="1.0.0"

cmd_version() {
  echo "componentctl version $COMPONENTCTL_VERSION"
  # Optional: show dependency versions
  gum --version 2>/dev/null || true
}
```

## Installation Dependencies

**Required:**
- bash 4+
- coreutils (readlink, realpath)

**Recommended:**
- `gum` - Beautiful UI (yay -S gum)
- `fzf` - Fuzzy finder (pacman -S fzf)

**Component-specific:**
- Document in component README
- Check in `doctor` command

## Testing Checklist

Before committing a new ctl script:

- [ ] Runs with gum installed
- [ ] Runs without gum (fallback works)
- [ ] `--help` shows usage
- [ ] `version` shows version
- [ ] `doctor` checks dependencies
- [ ] `menu` works (if gum available)
- [ ] Integrated into `aosctl` (if applicable)
- [ ] Added to `COMPONENTCTL_VERSION` variable
- [ ] Error handling works (trap on ERR)

## Quick Start

1. **Copy template:**
   ```bash
   cp scripts/ctl-template.sh <component>/<component>ctl
   chmod +x <component>/<component>ctl
   ```

2. **Customize:**
   - Replace `COMPONENT` with your component name
   - Implement `cmd_*` functions
   - Add component-specific commands
   - Update help text

3. **Test:**
   ```bash
   ./<component>ctl doctor
   ./<component>ctl menu
   ./<component>ctl --help
   ```

4. **Integrate:**
   - Add to `aosctl` (see aosctl integration section)
   - Document in component README
   - Commit with appropriate message

## Real-World Reference

**Study these for patterns:**
- `router/routerctl` - Full-featured (service + heartbeat)
- `bridge/bridgectl` - Service management
- `gas-tent-dev/tentctl` - API/webhook management
- `scripts/firectl` - Report generation

## Questions?

Check existing ctl scripts for patterns:
```bash
grep -l "has_gum" **/*ctl
```

## Version

Guidelines v1.0.0 - January 2026
