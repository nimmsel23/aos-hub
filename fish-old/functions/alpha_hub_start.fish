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
