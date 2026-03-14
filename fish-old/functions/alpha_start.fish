function alpha_start
    set alpha_dir ~/alpha-os
    
    if not test -d $alpha_dir
        mkdir -p $alpha_dir
        echo "Erstelle Alpha OS Ordner..."
    end
    
    cd $alpha_dir
    
    # Server starten im Hintergrund
    python -m http.server 8080 &
    set server_pid $last_pid
    
    echo "Alpha OS läuft auf http://localhost:8080"
    echo "PID: $server_pid"
    
    # Browser öffnen
    sleep 1
    firefox http://localhost:8080
end

# Server stoppen
function alpha_stop
    pkill -f "python -m http.server 8080"
    echo "Alpha OS Server gestoppt"
end
