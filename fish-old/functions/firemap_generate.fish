function firemap_generate
    set -l outfile /tmp/firemap_today.md

    # Titel und Datum
    echo "# 🔥 Fire Map – (today's focus)" > $outfile
    echo "📅 (generated: (date '+%Y-%m-%d %H:%M'))" >> $outfile
    echo "" >> $outfile

    # Task-Export und Markdown-Formatierung
    task fire export | \
    jq -r '.[] | "- [ ] \(.description) (`\(.tags | join(", "))`)"' >> $outfile

    # Leeres Ergebnis abfangen
    if test (wc -l < $outfile) -le 3
        echo "🚫 Keine heutigen Fire Map Tasks gefunden." > $outfile
    end

    # Vorschau mit glow
    glow -p $outfile
end
