# Python Hot List CLI

Universal CLI wrapper for AOS Hot List (bash/zsh/fish compatible).

## Installation

**Symlink to ~/bin:**
```bash
ln -s ~/aos-hub/python-hot/hot.py ~/bin/hot
chmod +x ~/aos-hub/python-hot/hot.py
```

**Or add alias to .bashrc / .zshrc:**
```bash
alias hot='python3 ~/aos-hub/python-hot/hot.py'
```

**Fish users:** Continue using the native Fish function in `.config/fish/functions/aos-hot.fish`

## Usage

```bash
# Add idea to Hot List
hot "New idea text"

# Show Hot List (Taskwarrior)
hot list

# Open Hot List entry by task number
hot open 123
```

## Features

- ✅ Creates .md file in `~/AlphaOS-Vault/Door/1-Potential/`
- ✅ Adds to `hotlist_index.json` (Source of Truth)
- ✅ Creates Taskwarrior task (project:HotList)
- ✅ Clean filenames (no timestamp prefix)
- ✅ Collision detection

## Requirements

- Python 3.6+
- Taskwarrior (`task` command)
- `~/AlphaOS-Vault/` directory

## Integration

Works with:
- GAS Hot List reader (`gas/hotlist.gs`)
- TickTick sync (`python-ticktick/ticktick_hotlist_sync.py`)
- Router Bot Door Flow extension
- Index Node Door Centre API

## Filename Format

**Old (timestamp prefix):**
```
20250116-143022--neue-idee.md
```

**New (clean slug):**
```
neue-idee.md
```

Collision detection prevents duplicate filenames.
