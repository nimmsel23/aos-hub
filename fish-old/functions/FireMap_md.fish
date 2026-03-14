function firemap_daily
    set -l date (date '+%Y-%m-%d')
    set -l mdfile "$HOME/Logs/firemaps/$date.md"

    mkdir -p (dirname $mdfile)

    echo "# 🔥 Fire Map – $date" > $mdfile
    echo "" >> $mdfile
    task +28orDie or due:today export | jq -r '.[] | "- [ ] \(.description) (`\(.tags | join(", "))`)"' >> $mdfile

    glow -p $mdfile

    # Telegram-Versand vorbereiten (optional)
    set -l token "<BOT_TOKEN>"
    set -l chat_id "<CHAT_ID>"
    curl -s -F document=@"$mdfile" "https://api.telegram.org/bot$token/sendDocument?chat_id=$chat_id"
end
