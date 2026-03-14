# ~/.config/fish/functions/profit.fish
function profit --description "Door-Pillar Profit: Wochen-Review"
    # Liste aller erledigten Tasks dieser Woche + Reflexionstemplate
    set weeknum (date "+%V")
    set dir "$HOME/AlphaOS-Vault/Door/Profit"
    set file "$dir/profit-week-$weeknum.md"
    mkdir -p $dir

    echo "# Door Profit – Woche $weeknum" > $file
    echo "" >> $file
    echo "## 📋 Erledigte Tasks (diese Woche)" >> $file
    task rc.report.profit.columns=id,description,end rc.report.profit.filter=status:completed,end.after:week | \
        sed '1d' >> $file
    echo "" >> $file

    echo "## 💭 Reflexion" >> $file
    echo "- Was lief gut?" >> $file
    echo "- Was habe ich gelernt?" >> $file
    echo "- Wo darf ich nachsteuern?" >> $file
    echo "" >> $file

    set editor nano
    $editor $file

    echo "💰 Door-Profit-Review gespeichert: $file"
end
