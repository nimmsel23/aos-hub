# AOS Hot List - Fish Shell Interface

**Path:** `~/.dotfiles/config/fish/functions/aos-hot.fish`
**Version:** 1.0 (2026-01-04)
**Purpose:** Terminal interface for AOS Hot List (POTENTIAL phase of THE DOOR)

---

## Overview

The AOS Hot List provides a **multi-format capture system** for ideas:

```
Terminal (fish) → hot "idea"
  ├─ 1. Markdown file     (~/AlphaOS-Vault/Door/1-Potential/*.md)
  ├─ 2. JSON index        (ideas.json with UUIDs)
  ├─ 3. Taskwarrior task  (project:HotList +hot +potential prio:L)
  └─ 4. TickTick sync     (via Taskwarrior on-add hook)
```

### Data Formats

| Format | Purpose | Location |
|--------|---------|----------|
| **Markdown** | Human-readable (Obsidian) | `~/AlphaOS-Vault/Door/1-Potential/*.md` |
| **JSON** | GAS/Bot processing | `~/AlphaOS-Vault/Door/1-Potential/ideas.json` |
| **Taskwarrior** | Source of Truth | `~/.task/` database |
| **TickTick** | Mobile access | Cloud (synced via hook) |

---

## Commands

### `hot "idea text"`

Add idea to Hot List (creates all 4 formats).

**Usage:**
```fish
hot "Build Door-Bot for Telegram interface"
```

**Output:**
```
🔥 Hot captured → /home/alpha/AlphaOS-Vault/Door/1-Potential/20260104-103045--build-door-bot.md
📋 Taskwarrior UUID: a3f2b91c-8c4e-4d21-9a1f-3d8e7f2c1b4a
```

**What happens:**
1. Creates Markdown file with YAML frontmatter + template
2. Adds entry to `ideas.json` with UUID reference
3. Creates Taskwarrior task (triggers TickTick hook automatically)
4. Syncs to Google Drive via rclone (background)

---

### `hotlist`

Show Hot List from Taskwarrior (uses custom report).

**Usage:**
```fish
hotlist
```

**Output:**
```
ID Project Tags          Idea                                         Age
-- ------- ------------- -------------------------------------------- ----
74 HotList hot potential Inbox test - verify this arrives in TickTick 7d
73 HotList hot potential TickTick project ID test with real project   7d
72 HotList hot potential Final integration test with TickTick hook    7d

8 tasks, 3 shown
```

**Taskwarrior Report Config:**
```ini
# In ~/.taskrc
report.hotlist.description=Hot List (Potential Phase - Q2 Focus)
report.hotlist.columns=id,project,tags,description,entry.age
report.hotlist.labels=ID,Project,Tags,Idea,Age
report.hotlist.filter=project:HotList status:pending +hot +potential
report.hotlist.sort=urgency-,entry-
```

---

### `hotopen N`

Open Hot List entry by Taskwarrior ID.

**Usage:**
```fish
hotopen 74    # Opens task ID 74's markdown file
```

**What it does:**
1. Gets UUID from Taskwarrior task ID
2. Looks up file path in `ideas.json` by UUID
3. Opens file in default application (xdg-open/open)

---

## Integration with Other Interfaces

### 1. Telegram Bot
```python
# ~/aos-hub/router/extensions/door_flow.py
@router.message(Command("hot"))
async def handle_hot(message: Message):
    idea = message.text.replace("/hot ", "")
    # Call hot CLI or write directly to JSON
    subprocess.run(["fish", "-c", f'hot "{idea}"'])
```

### 2. GAS WebApp
```javascript
// ~/aos-hub/gas/door.gs
function addHotIdea(idea) {
  // Read ideas.json from Drive
  var json = DriveApp.getFileById(IDEAS_JSON_ID);
  var data = JSON.parse(json.getBlob().getDataAsString());

  // Add new entry
  data.push({
    idea: idea,
    created: new Date().toISOString(),
    tw_uuid: null,  // Will be filled by fish command
    status: "active",
    quadrant: 2,
    tags: ["hot", "potential"]
  });

  // Write back
  json.setContent(JSON.stringify(data, null, 2));
}
```

### 3. Node.js Local Server
```javascript
// ~/aos-hub/index-node/routes/door.js
app.post('/api/door/hot', async (req, res) => {
  const { idea } = req.body;

  // Execute fish command
  const { exec } = require('child_process');
  exec(`fish -c 'hot "${idea}"'`, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: stderr });
    res.json({ success: true, output: stdout });
  });
});
```

---

## Markdown Template

When you run `hot "idea"`, it creates:

```markdown
---
type: hot
stage: potential
created: 2026-01-04T09:30:45Z
tags: [hot, potential]
source: fish
---

# 🔥 HOT — Build Door-Bot for Telegram

- Created: 2026-01-04 10:30
- Status: open
- Quadrant: Q2

## Why it matters (1–3 lines)
-

## Next micro-step (≤ 5 min)
-

## Notes
-
```

---

## JSON Structure

`ideas.json` format:

```json
[
  {
    "idea": "Build Door-Bot for Telegram",
    "created": "2026-01-04T09:30:45Z",
    "file": "/home/alpha/AlphaOS-Vault/Door/1-Potential/20260104-103045--build-door-bot.md",
    "tw_uuid": "a3f2b91c-8c4e-4d21-9a1f-3d8e7f2c1b4a",
    "status": "active",
    "quadrant": 2,
    "tags": ["hot", "potential"]
  }
]
```

**Key fields:**
- `tw_uuid`: Taskwarrior UUID (for cross-system sync)
- `file`: Path to Markdown file
- `quadrant`: Eisenhower Matrix (1-4, default: 2 = Q2)
- `status`: `active` | `done` | `archived`

---

## Taskwarrior Integration

### Task Creation
```fish
task add project:HotList prio:L +hot +potential "Idea text"
```

**UDA (User Defined Attributes):**
- `project:HotList` - All Hot List tasks
- `+hot` - Hot tag (for filtering)
- `+potential` - POTENTIAL phase tag (for hook)
- `prio:L` - Low priority (Q2 = important but not urgent)

### Hook: TickTick Sync

**Location:** `~/.task/hooks/on-add.hotlist-ticktick`

**Trigger:** Any task with `project:HotList` AND `+potential` tag

**Action:**
1. Extracts task details (description, UUID)
2. Calls TickTick API (creates task in "Potential" project)
3. Saves mapping: `tw_uuid → ticktick_id` in `~/.alphaos/hotlist_ticktick_map.json`

---

## File Locations

```
~/.dotfiles/config/fish/functions/aos-hot.fish   # Fish functions
~/.taskrc                                         # Taskwarrior config (hotlist report)
~/.task/hooks/on-add.hotlist-ticktick             # TickTick sync hook
~/AlphaOS-Vault/Door/1-Potential/                 # Markdown files
  ├─ *.md                                         # Individual ideas
  └─ ideas.json                                   # JSON index
~/.alphaos/hotlist_ticktick_map.json              # Taskwarrior ↔ TickTick mapping
```

---

## Troubleshooting

### "hot" command not found
```fish
source ~/.dotfiles/config/fish/functions/aos-hot.fish
```

### Taskwarrior tasks not syncing to TickTick
```bash
# Check hook is executable
ls -la ~/.task/hooks/on-add.hotlist-ticktick

# Check TickTick token
cat ~/.ticktick_token

# Check logs
tail -f ~/.local/share/alphaos/logs/hotlist-ticktick.log
```

### ideas.json not updating
```bash
# Check file permissions
ls -la ~/AlphaOS-Vault/Door/1-Potential/ideas.json

# Manually verify JSON is valid
jq '.' ~/AlphaOS-Vault/Door/1-Potential/ideas.json
```

---

## Next Steps

- [ ] Telegram Bot integration (`/hot` command)
- [ ] GAS WebApp (Google Forms → ideas.json)
- [ ] Node.js Door-Centre dashboard
- [ ] Obsidian plugin for inline capture

---

**Last Updated:** 2026-01-04
**Maintainer:** alpha (nimmsel23)
