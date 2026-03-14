#!/usr/bin/env fish

# Alpha OS Terminal Bot Setup für Fish Shell
# ==========================================

echo "🤖 Alpha OS Terminal Bot Setup (Fish Shell)"
echo "============================================"

# Pfade definieren
set ALPHA_HOME "$HOME/alpha-os"
set BOT_DIR "$ALPHA_HOME/bots/telegram-terminal"
set VENV_DIR "$BOT_DIR/venv"

echo "📁 Bot wird installiert in: $BOT_DIR"

# Verzeichnisse erstellen
mkdir -p "$BOT_DIR"
mkdir -p "$ALPHA_HOME/logs"
mkdir -p "$ALPHA_HOME/config"

# Ins Bot-Verzeichnis wechseln
cd "$BOT_DIR"

# Python prüfen
if not command -v python > /dev/null
    echo "🐍 Python wird installiert..."
    if command -v pacman > /dev/null
        sudo pacman -S python python-pip
    else
        echo "❌ Bitte installiere Python manuell"
        exit 1
    end
end

# Virtual Environment erstellen
echo "📦 Virtual Environment wird erstellt..."
python -m venv "$VENV_DIR"

# Virtual Environment aktivieren (Fish)
echo "🔄 Virtual Environment wird aktiviert..."
source "$VENV_DIR/bin/activate.fish"

# Dependencies installieren
echo "📥 Dependencies werden installiert..."
pip install python-telegram-bot

# Bot Token abfragen
echo ""
echo "🔑 Bot Token Setup"
echo "=================="
echo "Bot Token von @BotFather benötigt"
read -P "Bot Token eingeben (oder ENTER für später): " bot_token

if test -z "$bot_token"
    set bot_token "YOUR_TOKEN_HERE"
    echo "⚠️  Token kann später konfiguriert werden"
end

# Bot Config erstellen
echo "⚙️ Bot Konfiguration wird erstellt..."
cat > "$BOT_DIR/bot_config.json" << EOF
{
  "authorized_users": [],
  "auth_password": "alpha123",
  "max_output_length": 4000,
  "allowed_commands": [],
  "blocked_commands": [
    "rm -rf", "format", "fdisk", "mkfs", "dd if=", 
    "chmod 777", "passwd", "sudo passwd", "userdel"
  ]
}
EOF

# Platzhalter Bot-Script erstellen
echo "📝 Bot-Script Platzhalter wird erstellt..."
cat > "$BOT_DIR/telegram_terminal_bot.py" << 'EOF'
#!/usr/bin/env python3
"""
Alpha OS Terminal Bot - PLATZHALTER
===================================

🚨 WICHTIG: Hier muss der vollständige Bot-Code von Claude eingefügt werden!

Dieser Platzhalter dient nur zur Verzeichnisstruktur.
"""

print("🚨 PLATZHALTER - Bot-Code von Claude einfügen!")
print(f"📁 Datei: {__file__}")
exit(1)
EOF

chmod +x "$BOT_DIR/telegram_terminal_bot.py"

# Systemd Service erstellen
echo "🔧 Systemd Service wird erstellt..."
set current_user (whoami)
set service_content "[Unit]
Description=Alpha OS Terminal Bot
After=network.target

[Service]
Type=simple
User=$current_user
WorkingDirectory=$BOT_DIR
Environment=TELEGRAM_BOT_TOKEN=$bot_token
ExecStart=$VENV_DIR/bin/python $BOT_DIR/telegram_terminal_bot.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target"

echo "$service_content" | sudo tee /etc/systemd/system/alpha-terminal-bot.service > /dev/null

# Fish Environment Setup
echo "🐚 Fish Aliases werden erstellt..."
cat > "$ALPHA_HOME/bot_aliases.fish" << EOF
# Alpha OS Bot Aliases
# ====================

# Bot Verzeichnisse
set -x ALPHA_BOT_DIR "$BOT_DIR"
set -x ALPHA_BOT_VENV "$VENV_DIR"

# Service Management
alias bot-status 'sudo systemctl status alpha-terminal-bot'
alias bot-start 'sudo systemctl start alpha-terminal-bot'
alias bot-stop 'sudo systemctl stop alpha-terminal-bot'
alias bot-restart 'sudo systemctl restart alpha-terminal-bot'
alias bot-logs 'sudo journalctl -u alpha-terminal-bot -f'

# Development
alias bot-dir 'cd $ALPHA_BOT_DIR'
alias bot-edit 'cd $ALPHA_BOT_DIR && nano telegram_terminal_bot.py'
alias bot-config 'cd $ALPHA_BOT_DIR && nano bot_config.json'
alias bot-dev 'cd $ALPHA_BOT_DIR && source $ALPHA_BOT_VENV/bin/activate.fish'
alias bot-test 'cd $ALPHA_BOT_DIR && source $ALPHA_BOT_VENV/bin/activate.fish && python telegram_terminal_bot.py'

# Alpha OS Integration
alias alpha-fire 'task +fire list'
alias alpha-core 'task +core4 list'
alias alpha-today 'task due:today list'
EOF

# Fish config erweitern
if test -f ~/.config/fish/config.fish
    echo "source $ALPHA_HOME/bot_aliases.fish" >> ~/.config/fish/config.fish
    echo "✅ Fish config erweitert"
end

# Systemd Service registrieren
sudo systemctl daemon-reload
sudo systemctl enable alpha-terminal-bot

echo ""
echo "🎉 Alpha OS Terminal Bot Setup abgeschlossen!"
echo "============================================="
echo ""
echo "📍 Installation:"
echo "   Bot Dir:    $BOT_DIR"
echo "   Venv:       $VENV_DIR"
echo "   Service:    alpha-terminal-bot"
echo "   Config:     $BOT_DIR/bot_config.json"
echo ""
echo "🔧 Nächste Schritte:"
echo "   1. Bot-Code von Claude einfügen:"
echo "      nano $BOT_DIR/telegram_terminal_bot.py"
echo ""
echo "   2. Service starten:"
echo "      sudo systemctl start alpha-terminal-bot"
echo ""
echo "   3. Status prüfen:"
echo "      sudo systemctl status alpha-terminal-bot"
echo ""
echo "🐚 Fish Aliases (nach Shell-Restart):"
echo "   bot-status   - Service Status"
echo "   bot-logs     - Live Logs"
echo "   bot-edit     - Code bearbeiten"
echo "   bot-restart  - Service neu starten"
echo ""
echo "⚠️  WICHTIG:"
echo "   - Den vollständigen Bot-Code von Claude einfügen!"
echo "   - Shell neu starten für Aliases: exec fish"
echo "   - Bot Token ggf. später in Service konfigurieren"
