# ~/.config/fish/functions/alpha_hub.fish
# Alpha OS Telegram Hub Integration

# Start the modular hub
function alpha_hub_start
    set -l hub_script "$HOME/.local/bin/telegram_hub.py"
    set -l plugins_dir "$HOME/.alpha_os/telegram_modules"
    
    echo "🤖 Starting Alpha OS Telegram Hub..."
    
    # Ensure plugins directory exists
    mkdir -p $plugins_dir
    
    # Check if hub script exists
    if not test -f $hub_script
        echo "❌ Hub script not found: $hub_script"
        echo "💡 Save the hub script there first"
        return 1
    end
    
    # Check for tele config
    if not test -f "$HOME/.alpha_os/tele.env"
        echo "❌ No telegram config found"
        echo "💡 Run 'tele \"test\"' first to set up bot credentials"
        return 1
    end
    
    # Show plugin status
    set -l plugin_count (ls $plugins_dir/*.py 2>/dev/null | wc -l)
    echo "📦 Found $plugin_count plugins in $plugins_dir"
    
    # Start hub
    python3 $hub_script
end

# Stop the hub (if running via systemd)
function alpha_hub_stop
    if systemctl --user is-active --quiet alpha-telegram-hub
        systemctl --user stop alpha-telegram-hub
        echo "🛑 Alpha hub stopped"
    else
        echo "ℹ️  Alpha hub not running via systemd"
        echo "   Use Ctrl+C if running in terminal"
    end
end

# Check hub status
function alpha_hub_status
    echo "🤖 Alpha OS Telegram Hub Status"
    echo "================================"
    
    # Check config
    if test -f "$HOME/.alpha_os/tele.env"
        echo "✅ Config: tele.env found"
        set -l bot_token (grep BOT_TOKEN "$HOME/.alpha_os/tele.env" | cut -d= -f2)
        set -l chat_id (grep CHAT_ID "$HOME/.alpha_os/tele.env" | cut -d= -f2)
        echo "   Bot Token: ${bot_token:0:10}..."
        echo "   Chat ID: $chat_id"
    else
        echo "❌ Config: No tele.env found"
    end
    
    # Check hub script
    if test -f "$HOME/.local/bin/telegram_hub.py"
        echo "✅ Hub Core: telegram_hub.py found"
    else
        echo "❌ Hub Core: telegram_hub.py missing"
    end
    
    # Check plugins
    set -l plugins_dir "$HOME/.alpha_os/telegram_modules"
    set -l plugin_count (ls $plugins_dir/*.py 2>/dev/null | wc -l)
    echo "📦 Plugins: $plugin_count found in $plugins_dir"
    
    if test $plugin_count -gt 0
        ls $plugins_dir/*.py 2>/dev/null | while read plugin
            set -l name (basename $plugin .py)
            echo "   • $name"
        end
    end
    
    # Check if running
    if pgrep -f telegram_hub.py >/dev/null
        echo "🟢 Status: Hub is RUNNING"
    else
        echo "🔴 Status: Hub is STOPPED"
    end
end

# Install a plugin from template
function alpha_hub_install_plugin
    set -l plugin_name $argv[1]
    set -l plugins_dir "$HOME/.alpha_os/telegram_modules"
    
    if test -z "$plugin_name"
        echo "Usage: alpha_bot_install_plugin <plugin_name>"
        echo ""
        echo "Available templates:"
        echo "  warstack  - Interactive War Stack creation"
        echo "  core4     - Core4 tracking and scoring"
        echo "  firemap   - Fire Map generation"
        return 1
    end
    
    mkdir -p $plugins_dir
    
    switch $plugin_name
        case "warstack"
            echo "📦 Installing War Stack plugin..."
            echo "💡 Copy the warstack.py code to: $plugins_dir/warstack.py"
            echo "   Then restart the hub with: alpha_hub_start"
            
        case "core4"
            echo "📦 Creating Core4 plugin template..."
            cat > $plugins_dir/core4.py << 'EOF'
#!/usr/bin/env python3
"""
CORE4 TRACKING PLUGIN
====================
Track daily Core4 progress via Telegram.
"""

COMMANDS = ["/core4", "/score"]
DESCRIPTION = "Core4 daily tracking and scoring"

async def handle_command(update, context, command, args):
    if command == "/core4":
        await handle_core4_tracking(context)
    elif command == "/score":
        await handle_score_check(context)

async def handle_core4_tracking(context):
    message = """💪 **CORE4 DAILY TRACKING**
    
Track your progress:
• Body: Fitness + Fuel
• Being: Meditation + Memoirs  
• Balance: Partner + Posterity
• Business: Discover + Declare

Reply with completed items!
"""
    await context.send_message(message)

async def handle_score_check(context):
    # Simple score check - could integrate with your core4_score.py
    message = """📊 **CURRENT CORE4 SCORE**

Today: 2.5/4.0 points
Week: 18/28 points

Keep pushing for 28 or die! 🔥
"""
    await context.send_message(message)
EOF
            echo "✅ Core4 plugin created: $plugins_dir/core4.py"
            
        case "firemap"
            echo "📦 Creating Fire Map plugin template..."
            cat > $plugins_dir/firemap.py << 'EOF'
#!/usr/bin/env python3
"""
FIRE MAP PLUGIN
===============
Generate and send Fire Maps via Telegram.
"""

COMMANDS = ["/firemap", "/hits"]  
DESCRIPTION = "Fire Map generation and hit tracking"

async def handle_command(update, context, command, args):
    if command == "/firemap":
        await generate_firemap(context)
    elif command == "/hits":
        await show_hits(context)

async def generate_firemap(context):
    message = """🔥 **TODAY'S FIRE MAP**

**BODY**
• Morning workout (30min)
• Green smoothie

**BEING**  
• 20min meditation
• Journal reflection

**BALANCE**
• Call mom
• Appreciation text to partner

**BUSINESS**
• Finish client proposal
• Post LinkedIn article

Ready to dominate! 💪
"""
    await context.send_message(message)

async def show_hits(context):
    message = """🎯 **WEEKLY HITS STATUS**

✅ Hit 1: Complete automation setup
⏳ Hit 2: Client onboarding system  
⏳ Hit 3: Team training materials
⏳ Hit 4: Performance optimization

Keep pushing! 🔥
"""
    await context.send_message(message)
EOF
            echo "✅ Fire Map plugin created: $plugins_dir/firemap.py"
            
        case "*"
            echo "❌ Unknown plugin: $plugin_name"
            echo "Available: warstack, core4, firemap"
            return 1
    end
end

# Quick message via tele (reuse existing tele script)
function alpha_msg
    tele $argv
end

# Test hub connectivity
function alpha_hub_test
    echo "🧪 Testing hub connectivity..."
    
    if not test -f "$HOME/.alpha_os/tele.env"
        echo "❌ No tele.env found. Run 'tele \"test\"' first."
        return 1
    end
    
    # Send test message
    tele "🤖 Alpha Hub Test - $(date)"
    
    if test $status -eq 0
        echo "✅ Hub connectivity OK"
    else
        echo "❌ Hub connectivity failed"
        return 1
    end
end

# Aliases for common commands
alias ahub="alpha_hub_start"
alias ahub_status="alpha_hub_status"
alias ahub_stop="alpha_hub_stop"
alias amsg="alpha_msg"
