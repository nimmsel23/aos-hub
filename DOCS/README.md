# AOS Hub - Documentation

**Version:** 2.0 (2026-01-04)
**Purpose:** Central documentation for AlphaOS Hub ecosystem

---

## Overview

AOS Hub is the **integration layer** connecting Fish shell, Node.js server, GAS cloud services, Telegram bots, and Taskwarrior for the AlphaOS system.

---

## Documentation Index

### Fish Shell Interface
- **[Hot List (Fish)](./fish/aos-hot.md)** - Terminal interface for POTENTIAL phase
  - Commands: `hot`, `hotlist`, `hotopen`
  - Multi-format: MD + JSON + Taskwarrior → TickTick
  - Integration guide for Telegram/GAS/Node.js

### GAS (Google Apps Script)
- [Door Centre](./gas/door.md) - Door system cloud interface
- [Door - Hot List](./gas/door-hotlist.md) - Potential phase (GAS)
- [Door - War Stack](./gas/door-warstack.md) - Plan phase (GAS)
- [Door - War](./gas/door-war.md) - Production phase (GAS)
- [Door - Profit](./gas/door-profit.md) - Profit phase (GAS)

### Node.js Server
- Index Node - Local menu server (localhost:8799)
- Router - API routing & endpoints

### Python Bots
- Router Bot - Telegram command routing
- IDEAPAD Bot - Session logging & notifications

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  AOS HUB ECOSYSTEM                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  INTERFACES (Input)                                         │
│  ├─ Fish Shell       (hot, frame, fire, voice, war)        │
│  ├─ Telegram Bot     (/hot, /frame, /fire, /voice)         │
│  ├─ GAS WebApp       (Google Forms, Sheets)                │
│  └─ Node.js Server   (localhost:8799 API)                  │
│                                                             │
│  BACKEND (Data Layer)                                       │
│  ├─ Taskwarrior      (Source of Truth)                     │
│  ├─ Markdown Files   (Obsidian-friendly)                   │
│  ├─ JSON Files       (GAS/Bot processing)                  │
│  └─ Google Drive     (Cloud backup via rclone)             │
│                                                             │
│  SYNC & HOOKS                                               │
│  ├─ on-add hooks     (Taskwarrior → TickTick)              │
│  ├─ on-modify hooks  (ClaudeWarrior, Core4)                │
│  ├─ systemd timers   (Auto-sync, backups)                  │
│  └─ rclone           (Cloud sync)                          │
│                                                             │
│  EXTERNAL SERVICES                                          │
│  ├─ TickTick         (Mobile task management)              │
│  ├─ Google Calendar  (Fire Maps, deadlines)                │
│  ├─ Telegram         (Notifications, mobile ops)           │
│  └─ Google Drive     (Cloud storage)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Fish Shell
```fish
# Add to Hot List
hot "Build comprehensive Door-Bot"

# Show Hot List
hotlist

# Open Hot List entry
hotopen 74
```

### Telegram Bot
```
/hot Build comprehensive Door-Bot
/hotlist
/frame
/fire
```

### GAS WebApp
- Open [Door Centre](https://script.google.com/...)
- Submit idea via Google Form
- View Hot List in Google Sheet

### Node.js Server
```bash
# Start server
cd ~/aos-hub/index-node
npm start

# Access
http://localhost:8799
```

---

## Key Concepts

### The 4P Flow (THE DOOR)
1. **POTENTIAL** → Hot List (capture ideas)
2. **PLAN** → War Stacks (strategic planning)
3. **PRODUCTION** → Hit Lists (execution)
4. **PROFIT** → Review (achieved & done)

### The 4F Flow (THE GAME)
1. **FRAME** → Where am I now? (current reality)
2. **FREEDOM** → Annual vision (how do I get there?)
3. **FOCUS** → Monthly mission (what to do to stay on course?)
4. **FIRE** → Weekly execution (4×4 Hits from War Stacks)

### Data Formats
- **Markdown** → Humans (Obsidian)
- **JSON** → Bots/GAS (processing)
- **Taskwarrior** → Source of Truth (triggers TickTick)

---

## File Locations

```
~/aos-hub/
├── DOCS/                           # This documentation
│   ├── README.md                   # This file
│   ├── fish/aos-hot.md             # Fish Hot List docs
│   └── gas/*.md                    # GAS documentation
├── index-node/                     # Node.js local server
│   ├── server.js                   # Main server
│   ├── menu.yaml                   # Menu config
│   └── public/                     # Static files
├── router/                         # Python Telegram bot
│   ├── router_bot.py               # Main bot
│   └── extensions/door_flow.py     # Door commands
└── gas/                            # GAS scripts
    ├── door.gs                     # Door Centre main
    ├── door_warstack.gs            # War Stack generator
    └── ...

~/.dotfiles/config/fish/functions/
├── aos-hot.fish                    # Hot List interface
├── aos-war.fish                    # War Stack interface
└── aos-game.fish                   # Game Maps interface

~/AlphaOS-Vault/
├── Door/                           # THE DOOR data
│   ├── 1-Potential/                # Hot List (MD + JSON)
│   ├── 2-Plan/                     # War Stacks
│   ├── 3-Production/               # Hit Lists
│   └── 4-Profit/                   # Reviews
└── GAME/                           # THE GAME data
    ├── Frame/                      # Frame Maps
    ├── Freedom/                    # Freedom Maps
    ├── Focus/                      # Focus Maps
    └── Fire/                       # Fire Maps
```

---

## Contributing

See individual component docs for implementation details.

---

**Last Updated:** 2026-01-04
**Maintainer:** alpha (nimmsel23)
