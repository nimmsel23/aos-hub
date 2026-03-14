# =============================================
# ALPHA OS FISH ALIASES MASTER INTEGRATION
# =============================================
alias Generals Tent='alphaos_generals_tent'
alias Tent='alphaos_profit_review'
alias Door Profit='alphaos_door_profit'
alias Profit='alphaos_door_profit'
alias review='alphaos_profit_review'
alias aHot='alphaos_hot_add'
alias Hotlist='alphaos_hot_list'
alias Door='t Door && alphaos_door'
alias aFire='alphaos_fire_status && alphaos_fire_generate && alphaos_war_create'

#----- The Door - Possibillities - HOT LIST -------
alias taho= 'task add +hotlist' 
alias tahot='task add +hotlist'


# ----- The Game - Fire MAP ----------------
alias fireweek="task firew && task fire"
alias taf="today +fire"
#-- Taskwarrior Aliase
alias t='task'
alias ta='task add'
alias today='task add due:today'
alias tn='task next'
alias tnw='task next && task waiting'
alias training='ta workout'

alias tw='task waiting'
alias feek="task week && tw && task fire && task weekly"

alias ts='task strike'      # zeigt Strike-Liste
alias th='task hot'	        # zeigt Hotlist
alias tc='task core'        # zeigt Core4-Perspektive
alias td='task done'        # zeige erledigte Tasks

alias tas="task minimal"
alias TASK="task all"
alias uff="task overdue"

alias FIRE='task ready -hotlist ' 

alias none="task context none"
alias BODY="task context BODY"
alias BEING="task context BEING"
alias BALANCE="task context BALANCE"
alias BUSINESS="task context BUSINESS"


alias BOf='task context BOf'
alias BEf='task context BEf'
alias BAf='task context BAf'
alias BUf='task context BUf'


# Taskwarrior ALPHA_OS Commands
alias tasks-door='task door'
alias tasks-q2='task q2'
alias tasks-hits='task hits'

# Core4 aliases
alias morning='echo "🌅 ALPHA OS MORNING BRIEFING"; alpha core4; echo ""; alpha fire'
alias evening='echo "🌙 ALPHA OS EVENING REVIEW"; alpha achieved; echo ""; echo "Daily Voice reflection recommended"'


# Quick Core4 completions
#alias fitness='task fitness done; echo "🏋️ Fitness completed (+0.5)"'
#alias meditation='task meditation done; echo "🧘 Meditation completed (+0.5)"'
#alias partner='task partner done; echo "💝 Partner appreciation completed (+0.5)"'
#alias discover='task discover done; echo "📚 Discover completed (+0.5)"'

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
