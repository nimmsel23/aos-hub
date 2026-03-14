function firemd
    set -l today (date +%F)
    set -l outfile "$HOME/AlphaOS-Vault/Daily/{$today}_fire.md"

    echo "# 🔥 Fire Map – $today" > $outfile
    echo "" >> $outfile

    # Tasks abrufen (nur +fire, keine HotList, als Markdown)
    task +fire project.not:HotList status:pending export | \
        jq -r '.[] | "- [ ] \(.description)"' >> $outfile

    echo "" >> $outfile
    echo "✅ Exported Fire Map to: $outfile"
end
