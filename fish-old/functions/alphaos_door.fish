#!/usr/bin/env fish

# ============================================================================
# ALPHA OS DOOR SYSTEM - Fish Implementation
# Kapitel 25-30: The Door (Potential → Plan → Production → Profit)
# ============================================================================

# Konfiguration
set -g ALPHAOS_HOME "$HOME/.alphaos"
set -g ALPHAOS_OBSIDIAN "$HOME/Obsidian/Alpha_OS"  # Anpassen an dein Vault
set -g ALPHAOS_WEEK (date +%G-W%V)  # ISO Week (2024-W01)

# ============================================================================
# MAIN DOOR INTERFACE
# ============================================================================

function alphaos_door
    switch $argv[1]
        case "hot"
            switch $argv[2]
                case "add"
                    alphaos_hot_add $argv[3..-1]
                case "list" "ls"
                    alphaos_hot_list
                case "*"
                    echo "Hot List Commands:"
                    echo "  alphaos door hot add [idea]  - Add new idea"
                    echo "  alphaos door hot list        - Show all ideas"
            end
            
        case "war"
            switch $argv[2]
                case "create" "new"
                    alphaos_war_create
                case "*"
                    echo "War Stack Commands:"
                    echo "  alphaos door war create      - Create new War Stack"
            end
            
        case "fire"
            switch $argv[2]
                case "generate" "gen"
                    alphaos_fire_generate
                case "status" "show"
                    alphaos_fire_status
                case "*"
                    echo "Fire Map Commands:"
                    echo "  alphaos door fire generate   - Generate Fire Map"
                    echo "  alphaos door fire status     - Show Fire Map status"
            end
            
        case "profit"
            switch $argv[2]
                case "review" "tent"
                    alphaos_profit_review
                case "*"
                    echo "Profit Commands:"
                    echo "  alphaos door profit review   - General's Tent review"
            end
            
        case "*"
            echo "🚪 ALPHA OS DOOR SYSTEM"
            echo ""
            echo "THE 4 P'S:"
            echo "  🔥 POTENTIAL: alphaos door hot add/list"
            echo "  ⚔️ PLAN:      alphaos door war create"
            echo "  🎯 PRODUCTION: alphaos door fire generate/status"
            echo "  🏆 PROFIT:     alphaos door profit review"
            echo ""
            echo "Current Week: $ALPHAOS_WEEK"
    end
end

# Aliases
alias ahot="alphaos door hot"
alias awar="alphaos door war" 
alias afire="alphaos door fire"
alias aprofit="alphaos door profit"
alias adoor="alphaos door"

echo "🚪 Alpha OS Door System loaded. Type 'alphaos door' to start."
