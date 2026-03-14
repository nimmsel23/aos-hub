# Aliases for common commands
alias ahub="alpha_hub_start"
alias ahub_status="alpha_hub_status"
alias ahub_stop="alpha_hub_stop"
alias amsg="alpha_msg"

# ALPHA_OS Door System Aliases
alias door.py='python3 ~/dev/alpha-door/alpha_door/main.py'
alias hot.py='python3 ~/dev/alpha-door/alpha_door/main.py hotlist'
alias tent.py='python3 ~/dev/alpha-door/alpha_door/main.py review'
alias war.py='python3 ~/dev/alpha-door/alpha_door/main.py warstack'
alias fire.py='python3 ~/dev/alpha-door/alpha_door/main.py firemap'
alias door-tui.py='python3 ~/dev/alpha-door/alpha_door/main.py tui'

# Enhanced workflow aliases
alias alpha_status='alpha status'
alias core4_score='python3 ~/.local/share/alpha_os/scripts/alpha_core.py score'
alias fire_map='alpha fire'
alias capture_idea='alpha hotlist add'

# systemd management
alias alpha_services='systemctl --user status alpha-*.timer'
alias alpha_logs='journalctl --user -u alpha-*.service -f'

