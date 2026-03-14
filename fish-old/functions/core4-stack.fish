function core4-stack --description 'Zeigt aktuellen CORE4 Supplement-Stack nach Tageszeit oder Woche'
    set hour (date +%H)
    set arg1 $argv[1]
    set config_file ~/.alpha_os/stack/core4-stack.conf

    if test "$arg1" = "--edit"
        if not test -f $config_file
            mkdir -p (dirname $config_file)
            touch $config_file
            echo "# Beispiel-Konfiguration" > $config_file
            echo "[morning]\nKreatin 5g\nD3+K2 5000IE\nAshwagandha\nZink 25mg" >> $config_file
            echo "\n[noon]\nBrahmi\nPassionsblume (optional)" >> $config_file
            echo "\n[evening]\nMagnesiumkomplex\nMulungu\nGlycin 3g\nZink (wenn nicht morgens)" >> $config_file
            echo "\n[week]\nAshwagandha: 5 Tage, dann Pause\nTongkat Ali: 3–5x/Woche\nMulungu/Passionsblume: max. 2x/Woche" >> $config_file
        end
        $EDITOR $config_file
        return
    end

    if test "$arg1" = "--week"
        echo "\n📆 CORE4 STACK WOCHENPLAN"
        grep -A 10 '\[week\]' $config_file | tail -n +2
    else if test $hour -lt 11
        echo "\n🌅 MORGEN-STACK"
        grep -A 10 '\[morning\]' $config_file | tail -n +2
    else if test $hour -lt 17
        echo "\n☀️ MITTAG-STACK"
        grep -A 10 '\[noon\]' $config_file | tail -n +2
    else
        echo "\n🌇 ABEND-STACK"
        grep -A 10 '\[evening\]' $config_file | tail -n +2
    end
end
