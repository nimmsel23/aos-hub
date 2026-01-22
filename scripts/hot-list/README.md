# Hot List Scripts

**Status:** ⚠️ DEPRECATED - Use `aos-hot.fish` instead

## hot_to_md.sh

**Purpose:** Create markdown file from Taskwarrior Hot List task (via taskopen)

**Usage:**
```bash
hot_to_md.sh <UUID> "<DESCRIPTION>"
```

**What it does:**
1. Creates markdown file in `~/AlphaOS-Vault/Door/1-Potential/`
2. Filename: `YYYY-MM-DD-<slug>.md`
3. Annotates Taskwarrior task with `file://` link
4. Opens file in `$EDITOR`

**Why deprecated:**
- `~/.config/fish/functions/hot.fish` is the recommended tool
- `hot.fish` has better features:
  - Frontmatter with YAML metadata
  - Direct Taskwarrior integration (`project:HotList +hot +potential`)
  - rclone sync to Google Drive
  - Consistent with AlphaOS Command Center

**Migration:**
Instead of:
```bash
hot_to_md.sh $UUID "My idea"
```

Use:
```fish
hot "My idea"
```

**Keep or Remove?**
- Keep as reference implementation for taskopen integration
- Could be useful for non-fish users (bash/zsh)
- Remove if hot.fish is sufficient

---

**Related:**
- `~/.dotfiles/config/fish/functions/aos-hot.fish` - Active implementation
- `scripts/hot-list/aos-hot.fish` - Repo copy
- `index-node/server.js` - POST `/api/door/hotlist` endpoint
- `DOOR_CENTRE.md` - Hot List documentation
