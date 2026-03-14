function voice
    # Gemeinsame Variablen
    set timestamp (date "+%Y-%m-%d")
    set timeblock (date "+%H:%M")

    # Falls erstes Argument eine reine Zahl ist → Task-Branch
    if set -q argv[1]; and string match -qr '^[0-9]+$' -- $argv[1]
        set task_id $argv[1]
        set dir "$HOME/AlphaOS-Vault/Voice"
        set file "$dir/task-$task_id-$timestamp.md"
        mkdir -p $dir

        # Header anlegen, falls neu
        if not test -e $file
            echo "# Voice Log zu Task $task_id" > $file
            echo "" >> $file
            # Beschreibung aus Task holen
            set desc (task $task_id export | jq -r '.[0].description' 2>/dev/null)
            test -n "$desc" && echo "**Task:** $desc\n" >> $file
        end

        # neuen Timeblock einfügen
        echo "## 🕒 $timeblock" >> $file
        echo "" >> $file

        # Editor öffnen
        set editor nano
        $editor $file

        echo "🎙️ Voice-Entry für Task $task_id gespeichert: $file"

    else
        # Freier-Branch: Text direkt als Note speichern
        set dir "$HOME/AlphaOS-Vault/Tasks"
        set file "$dir/{$timestamp}_voice.md"
        mkdir -p $dir

        # Header anlegen, falls neu
        if not test -e $file
            echo "# Freie Voice-Reflexion – $timestamp" > $file
            echo "" >> $file
        end

        # neuen Timeblock einfügen
        echo "## 🕒 $timeblock" >> $file
        echo "" >> $file

        # Wenn Argumente vorhanden, hängen wir sie als Text an.
        if set -q argv[1]
            # Alle Args zu einem String
            echo $argv | sed 's/\\n/\
/g' >> $file
            echo "" >> $file
            echo "🧠 Freie Voice-Notiz angehängt: $file"
        else
            # Ohne Args öffne den Editor
            set editor nano
            $editor $file
            echo "🧠 Freie Voice-Notiz editiert: $file"
        end
    end
end
