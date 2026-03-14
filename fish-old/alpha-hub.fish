function alpha-hub --description "Unified Telegram Hub Controller"
    switch $argv[1]
        case start
            echo "🚀 Starting Telegram Hub (systemd + direct)…"
            systemctl --user start alpha-telegram-hub
            alpha_hub_start
        case stop
            echo "🛑 Stopping Telegram Hub…"
            systemctl --user stop alpha-telegram-hub
            alpha_hub_stop
        case restart
            echo "🔄 Restarting Telegram Hub…"
            systemctl --user restart alpha-telegram-hub
            alpha_hub_restart
        case status
            systemctl --user status alpha-telegram-hub --no-pager
            alpha_hub_status
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
        case plugin
            if test -z "$argv[2]"
                echo "⚠️  Plugin-Name fehlt. Usage: alpha-hub plugin <name>"
            else
                alpha_hub_install_plugin $argv[2]
            end
        case test
            alpha_hub_test
        case '*'
            echo "🔥 Alpha Hub Controller"
            echo "Usage: alpha-hub [start|stop|restart|status|logs|log|enable|disable|plugin <name>|test]"
    end
end
