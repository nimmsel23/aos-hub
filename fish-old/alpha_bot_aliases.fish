# Alpha OS Bot Aliases für Fish Shell
# ===================================

# Service Management
alias bot-status 'sudo systemctl status alpha-terminal-bot'
alias bot-start 'sudo systemctl start alpha-terminal-bot'
alias bot-stop 'sudo systemctl stop alpha-terminal-bot'
alias bot-restart 'sudo systemctl restart alpha-terminal-bot'
alias bot-logs 'sudo journalctl -u alpha-terminal-bot -f'

# Development
alias bot-dir 'cd /home/alpha/alpha-os/bots/telegram-terminal'
alias bot-edit 'cd /home/alpha/alpha-os/bots/telegram-terminal && nano telegram_terminal_bot.py'
alias bot-config 'cd /home/alpha/alpha-os/bots/telegram-terminal && nano bot_config.json'

# Alpha OS
alias alpha-fire 'task +fire list'
alias alpha-core 'task +core4 list'
alias alpha-today 'task due:today list'
