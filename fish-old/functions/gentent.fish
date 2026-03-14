# ~/.config/fish/functions/gentent.fish
function gentent --description "Game-Pillar: Weekly General’s Tent"
    # Wöchentliche Strategie-Session
    set weeknum (date "+%V")
    set dir "$HOME/AlphaOS-Vault/Game/GeneralTent"
    set file "$dir/generalstent-week-$weeknum.md"
    mkdir -p $dir

    echo "# General’s Tent – Woche $weeknum" > $file
    echo "" >> $file
    echo "## 1. Return & Report" >> $file
    echo "- Freedom Maps (Jahres-Status):" >> $file
    echo "- Focus Maps (Monats-Status):" >> $file
    echo "- Fire Maps (Wochen-Status):" >> $file
    echo "- Core Punkte /28:" >> $file
    echo "" >> $file
    echo "## 2. Lessons Learned" >> $file
    echo "- Was habe ich diese Woche gelernt?" >> $file
    echo "" >> $file
    echo "## 3. Course Correction" >> $file
    echo "- Welche Adjustments?" >> $file
    echo "" >> $file
    echo "## 4. New Targets" >> $file
    echo "- Nächste Four Hits:" >> $file
    echo "" >> $file

    set editor nano
    $editor $file

    echo "⛺ General’s Tent Notiz gespeichert: $file"
end
