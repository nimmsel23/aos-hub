#!
function alpha-hub --description "Manage Alpha OS Telegram Hub"
    switch $argv[1]
        case start
            systemctl --user start alpha-telegram-hub
            echo "🚀 Alpha Hub started"
        case stop
            systemctl --user stop alpha-telegram-hub
            echo "🛑 Alpha Hub stopped"
        case restart
            systemctl --user restart alpha-telegram-hub
            echo "🔄 Alpha Hub restarted"
        case status
            systemctl --user status alpha-telegram-hub --no-pager
        case logs
            journalctl --user -u alpha-telegram-hub -f
        case log
            tail -f ~/.alpha_os/hub.log
        case enable
            systemctl --user enable alpha-telegram-hub
            echo "✅ Auto-start enabled"
        case disable
            systemctl --user disable alpha-telegram-hub
            echo "❌ Auto-start disabled"
        case '*'
            echo "🔥 Alpha Hub Management"
            echo "Usage: alpha-hub [start|stop|restart|status|logs|log|enable|disable]"
    end
end
