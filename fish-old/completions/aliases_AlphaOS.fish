# =============================================
# ALPHA OS FISH ALIASES MASTER INTEGRATION
# =============================================

#----- The Door - Possibillities - HOT LIST -------
alias taho= 'task add +hotlist' 
alias tahot='task add +hotlist'


# ----- The Game - Fire MAP ----------------
alias fireweek="task firew && task fire"
alias taf="today +fire"
#-- Taskwarrior Aliase
alias t='task'
alias ta='task add'
alias today='task add due:eod'
alias tn='task next'
alias tnw='task next && task waiting'

alias tw='task waiting'
alias feek="task week && task firew && task next"

alias ts='task strike'      # zeigt Strike-Liste
alias th='task hot'	        # zeigt Hotlist
alias tc='task core'        # zeigt Core4-Perspektive
alias td='task done'        # zeige erledigte Tasks

# Taskwarrior ALPHA_OS Commands
alias tasks-door='task door'
alias tasks-q2='task q2'
alias tasks-hits='task hits'

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

# Core4 aliases
alias morning='echo "🌅 ALPHA OS MORNING BRIEFING"; alpha core4; echo ""; alpha fire'
alias evening='echo "🌙 ALPHA OS EVENING REVIEW"; alpha achieved; echo ""; echo "Daily Voice reflection recommended"'


# Quick Core4 completions
#alias fitness='task fitness done; echo "🏋️ Fitness completed (+0.5)"'
#alias meditation='task meditation done; echo "🧘 Meditation completed (+0.5)"'
#alias partner='task partner done; echo "💝 Partner appreciation completed (+0.5)"'
#alias discover='task discover done; echo "📚 Discover completed (+0.5)"'


