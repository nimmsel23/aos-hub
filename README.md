# AOS Hub

**AlphaOS Hub** - Central infrastructure for the AlphaOS ecosystem

## Components

### 1. Index Node (HTTP Server)
HTTP server serving `menu.yaml` for AlphaOS Command Center navigation.

**Location:** `index-node/`
**Service:** `aos-index.service`
**Port:** 8799 (default)

**Start:**
```bash
cd ~/aos-hub/index-node
node server.js
```

### 2. Router Bot (Telegram Router)
Telegram bot with pluggable extension system for AlphaOS operations.

**Location:** `router/`
**Service:** `aos-router.service`
**Architecture:** Hub-and-spoke pattern (router + extensions)

**Start:**
```bash
cd ~/aos-hub/router
python router_bot.py
```

**Extensions:**
- Door Centre (Hot List, War Stacks, 4P Flow)
- Game Centre (Fire Maps, Frame Maps, General's Tent)
- System (git sync, backups, health checks)

## Installation

### 1. Clone Repository
```bash
git clone https://github.com/nimmsel23/aos-hub.git ~/aos-hub
```

### 2. Install Dependencies

**Index Node:**
```bash
cd ~/aos-hub/index-node
npm install
```

**Router Bot:**
```bash
cd ~/aos-hub/router
pip install -r requirements.txt
```

### 3. Configure

**Index Node:**
Edit `menu.yaml` to customize navigation menu

**Router Bot:**
Edit `config.yaml` with your Telegram credentials and extension settings

### 4. Install systemd Services (Optional)

```bash
ln -s ~/aos-hub/systemd/aos-index.service ~/.config/systemd/user/
ln -s ~/aos-hub/systemd/aos-router.service ~/.config/systemd/user/

systemctl --user enable --now aos-index.service
systemctl --user enable --now aos-router.service
```

## Documentation

- **Index Node:** See `index-node/README.md`
- **Router Bot:** See `router/README.md` and `router/ARCHITECTURE.md`

## Integration with AlphaOS-Vault

Both components integrate with the AlphaOS-Vault for:
- Reading/Writing Hot Lists (Door Centre)
- Creating War Stacks (Door Centre)
- Managing Fire Maps (Game Centre)
- Accessing VOICE sessions
- Syncing with git

**Vault Location:** `~/AlphaOs-Vault/` or `~/Dokumente/AlphaOs-Vault/`

## License

MIT License

## Links

- **AlphaOS-Vault:** https://github.com/nimmsel23/AlphaOs-Vault (private)
- **Dotfiles:** https://github.com/nimmsel23/dotfiles
