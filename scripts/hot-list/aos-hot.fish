#!/usr/bin/env fish
# AOS Hot List - Simplified single-file interface
# Usage:
#   hot "idea"       - Add to Hot List
#   hotlist          - Show Hot List (Taskwarrior report)
#   hotopen N        - Open Hot List entry by number

set -g ALPHAOS_VAULT "$HOME/AlphaOS-Vault"
set -g HOT_DIR "$ALPHAOS_VAULT/Door/1-Potential"
set -g HOT_PROJECT "HotList"

function hot --description "Add idea to Hot List (MD + JSON + Taskwarrior → TickTick)"
    if test (count $argv) -eq 0
        echo "Usage: hot \"Idea text...\""
        echo ""
        echo "Saves to:"
        echo "  - Markdown file (Obsidian)"
        echo "  - hotlist_index.json (GAS processing)"
        echo "  - Taskwarrior (Source of Truth)"
        echo "  - TickTick (via hook)"
        return 1
    end

    # Ensure directory exists
    if not test -d "$HOT_DIR"
        mkdir -p "$HOT_DIR"
    end

    set -l idea (string join " " $argv)

    # Timestamps
    set -l iso (date -u +%Y-%m-%dT%H:%M:%SZ)
    set -l day (date +%Y-%m-%d)
    set -l hm (date +%H:%M)
    set -l stamp (date +%Y%m%d-%H%M%S)

    # Filename (simple slug)
    set -l slug (echo "$idea" | string lower | string replace -r -a -- '[^a-z0-9 \-]' '' | string replace -r -a -- '\s+' '-' | string replace -r -a -- '-+' '-' | string replace -r -a -- '(^-+|-+$)' '' | string sub -l 50)
    if test -z "$slug"
        set slug "hot"
    end
    set -l file "$HOT_DIR/$stamp--$slug.md"

    # 1. Create Markdown file
    printf -- "---\n" > "$file"
    printf -- "type: hot\n" >> "$file"
    printf -- "stage: potential\n" >> "$file"
    printf -- "created: %s\n" "$iso" >> "$file"
    printf -- "tags: [hot, potential]\n" >> "$file"
    printf -- "source: fish\n" >> "$file"
    printf -- "---\n\n" >> "$file"

    printf -- "# 🔥 HOT — %s\n\n" "$idea" >> "$file"
    printf -- "- Created: %s %s\n" "$day" "$hm" >> "$file"
    printf -- "- Status: open\n" >> "$file"
    printf -- "- Quadrant: Q2\n" >> "$file"
    printf -- "\n## Why it matters (1–3 lines)\n- \n\n" >> "$file"
    printf -- "## Next micro-step (≤ 5 min)\n- \n\n" >> "$file"
    printf -- "## Notes\n- \n" >> "$file"

    # 2. Add to Taskwarrior (Source of Truth - triggers TickTick hook)
    set -l tw_uuid ""
    if type -q task
        set -l tw_output (task add project:$HOT_PROJECT prio:L +hot +potential "$idea" 2>&1)
        if test $status -eq 0
            # Extract task ID (not UUID, but ID number)
            set tw_uuid (echo "$tw_output" | grep -oP 'Created task \K[0-9]+' || echo "")

            # Get actual UUID
            if test -n "$tw_uuid"
                set -l actual_uuid (task _get $tw_uuid.uuid 2>/dev/null)
                if test -n "$actual_uuid"
                    set tw_uuid "$actual_uuid"
                end
            end
        else
            echo "⚠️  Taskwarrior add failed (file created)."
        end
    end

    # 3. Add to hotlist_index.json (for GAS processing)
    set -l json_file "$HOT_DIR/hotlist_index.json"

    if not test -f "$json_file"
        echo '{ "items": [] }' > "$json_file"
    end

    set -l entry (jq -n \
        --arg idea "$idea" \
        --arg created "$iso" \
        --arg file "$file" \
        --arg tw_uuid "$tw_uuid" \
        --arg status "active" \
        --argjson quadrant 2 \
        '{
            idea: $idea,
            created: $created,
            file: $file,
            tw_uuid: $tw_uuid,
            status: $status,
            quadrant: $quadrant,
            tags: ["hot", "potential"]
        }')

    set -l updated (jq --argjson entry "$entry" '
        if (has("items") and (.items | type == "array")) then
          .items += [$entry]
        elif (type == "array") then
          { items: (. + [$entry]) }
        else
          { items: [$entry] }
        end
      ' "$json_file")
    echo "$updated" > "$json_file"

    # 4. rclone sync to Google Drive (background, optional)
    if type -q rclone
        rclone copy "$file" "eldanioo:Alpha_Door/1-Potential/" --ignore-existing >/dev/null 2>&1 &
    end

    echo "🔥 Hot captured → $file"
    if test -n "$tw_uuid"
        echo "📋 Taskwarrior UUID: $tw_uuid"
    end
end

function hotlist --description "Show Hot List from Taskwarrior"
    if type -q task
        # Use Taskwarrior custom report
        task hotlist
    else
        echo "❌ Taskwarrior not found"
        return 1
    end
end

function hotopen --description "Open Hot List entry by number from Taskwarrior"
    if not type -q task
        echo "❌ Taskwarrior not found"
        return 1
    end

    set -l idx 1
    if test (count $argv) -ge 1
        set idx $argv[1]
    end

    if not string match -qr '^[0-9]+$' -- "$idx"
        echo "Usage: hotopen N (task ID)"
        return 1
    end

    # Get task UUID
    set -l uuid (task _get $idx.uuid 2>/dev/null)
    if test -z "$uuid"
        echo "❌ Task $idx not found"
        return 1
    end

    # Find corresponding MD file in hotlist_index.json
    set -l json_file "$HOT_DIR/hotlist_index.json"
    if test -f "$json_file"
        set -l file (jq -r '
            if (has("items") and (.items | type == "array")) then
              .items[] | select(.tw_uuid == $uuid) | .file
            elif (type == "array") then
              .[] | select(.tw_uuid == $uuid) | .file
            else
              empty
            end
          ' --arg uuid "$uuid" "$json_file" 2>/dev/null)

        if test -n "$file" -a -f "$file"
            if type -q xdg-open
                xdg-open "$file" >/dev/null 2>&1 &
            else if type -q open
                open "$file" >/dev/null 2>&1 &
            else
                echo "$file"
            end
            return 0
        end
    end

    echo "⚠️  No MD file found for task $idx (UUID: $uuid)"
    echo "File might not be tracked in hotlist_index.json"
end
