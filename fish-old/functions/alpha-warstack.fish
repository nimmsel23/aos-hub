function alpha-warstack --description "Manage Alpha OS War Stack Bot"
    switch $argv[1]
        case start
            systemctl --user start alpha-warstack-bot
            echo "🚀 War Stack Bot started"
        case stop
            systemctl --user stop alpha-warstack-bot
            echo "🛑 War Stack Bot stopped"
        case restart
            systemctl --user restart alpha-warstack-bot
            echo "🔄 War Stack Bot restarted"
        case status
            systemctl --user status alpha-warstack-bot --no-pager
        case logs
            journalctl --user -u alpha-warstack-bot -f
        case enable
            systemctl --user enable alpha-warstack-bot
            echo "✅ Auto-start enabled"
        case disable
            systemctl --user disable alpha-warstack-bot
            echo "❌ Auto-start disabled"
        case '*'
            echo "⚔️  War Stack Management"
            echo "Usage: alpha-warstack [start|stop|restart|status|logs|enable|disable]"
    end
end
