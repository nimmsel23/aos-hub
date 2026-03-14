# ~/.config/fish/functions/hot.fish





function hot --description "Hotlist-Pillar: Possibilities quick-capture"
    set timestamp (date "+%Y-%m-%d_%H-%M")
    set dir "$HOME/AlphaOS-Vault/Possibilities"
    set file "$dir/$timestamp.md"
    mkdir -p $dir

    # Direkt-text aus argv zu Datei
    echo "# Possibility – $timestamp" > $file
    echo "" >> $file
    echo $argv | sed 's/\\n/\
/g' >> $file
    echo "" >> $file

    echo "💡 Possibility gespeichert: $file"


    # TaskWarrior Integration
    if command -v task >/dev/null
        set priority L
	end
        
        set task_id (task add "$argv" project:HotList priority:$priority +q$quadrant | grep -o 'Created task [0-9]*' | grep -o '[0-9]*')
        if test -n "$task_id"
            echo "📋 TaskWarrior Task #$task_id erstellt"
        end
    end
    
