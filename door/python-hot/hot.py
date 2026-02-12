#!/usr/bin/env python3
"""
AOS Hot List - Universal CLI wrapper (bash/zsh/fish compatible)

Usage:
  hot "idea"       - Add to Hot List
  hot list         - Show Hot List (Taskwarrior report)
  hot open N       - Open Hot List entry by number
"""

import json
import os
import re
import secrets
import subprocess
import sys
from datetime import datetime
from pathlib import Path


ALPHAOS_VAULT = Path.home() / "AlphaOS-Vault"
HOT_DIR = ALPHAOS_VAULT / "Door" / "1-Potential"
HOT_PROJECT = "HotList"


def make_slug(text: str, max_length: int = 50) -> str:
    """Create URL-safe slug from text."""
    slug = text.lower()
    slug = re.sub(r'[^a-z0-9\s\-]', '', slug)
    slug = re.sub(r'\s+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')
    return slug[:max_length] if slug else "hot"


def add_to_hotlist(idea: str) -> int:
    """Add idea to Hot List (MD + JSON + Taskwarrior)."""

    # Ensure directory exists
    HOT_DIR.mkdir(parents=True, exist_ok=True)

    # Generate filename with UUID prefix (prevents collisions)
    slug = make_slug(idea)
    uuid_prefix = secrets.token_hex(2)  # 4-char hex (e.g., "a7f2")
    filename = f"{uuid_prefix}-{slug}.md"
    file_path = HOT_DIR / filename

    # Timestamps
    now = datetime.now()
    iso = now.astimezone().isoformat()
    day = now.strftime("%Y-%m-%d")
    hm = now.strftime("%H:%M")

    # 1. Add to Taskwarrior FIRST (need UUID for frontmatter)
    tw_uuid = None
    try:
        result = subprocess.run(
            ["task", "add", f"project:{HOT_PROJECT}", "prio:L", "+hot", "+potential", idea],
            capture_output=True,
            text=True,
            check=True
        )

        # Extract task ID
        match = re.search(r'Created task (\d+)', result.stdout)
        if not match:
            print(f"⚠️  Taskwarrior: Could not extract task ID")
            tw_uuid = None
        else:
            task_id = match.group(1)

            # Get UUID
            uuid_result = subprocess.run(
                ["task", "_get", f"{task_id}.uuid"],
                capture_output=True,
                text=True,
                check=True
            )
            tw_uuid = uuid_result.stdout.strip()
            print(f"✅ Taskwarrior: {task_id} (UUID: {tw_uuid[:8]}...)")

    except subprocess.CalledProcessError as e:
        print(f"⚠️  Taskwarrior add failed: {e}")
        tw_uuid = None

    # 2. Create Markdown file with tw_uuid in frontmatter
    markdown_content = f"""---
tw_uuid: {tw_uuid or 'null'}
---

# 🔥 {idea}
"""

    file_path.write_text(markdown_content, encoding='utf-8')
    print(f"✅ Markdown: {filename}")

    # 3. Add to hotlist_index.json
    json_file = HOT_DIR / "hotlist_index.json"

    if json_file.exists():
        try:
            data = json.loads(json_file.read_text(encoding='utf-8'))
            # Handle both {items: [...]} and [...] formats
            if isinstance(data, list):
                items = data
                data = {"items": items}
            elif "items" not in data:
                data["items"] = []
        except Exception as e:
            print(f"⚠️  JSON parse error: {e}")
            data = {"items": []}
    else:
        data = {"items": []}

    # Add entry
    entry = {
        "idea": idea,
        "created": iso,
        "file": str(file_path),
        "tw_uuid": tw_uuid,
        "status": "active",
        "quadrant": 2,
        "tags": ["hot", "potential"]
    }

    data["items"].append(entry)

    # Save JSON
    json_file.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f"✅ JSON: hotlist_index.json (total: {len(data['items'])} items)")

    return 0


def show_hotlist():
    """Show Hot List via Taskwarrior."""
    try:
        subprocess.run(
            ["task", "project:HotList", "status:pending"],
            check=False
        )
    except FileNotFoundError:
        print("❌ Taskwarrior not found. Install with: sudo pacman -S task")
        return 1
    return 0


def open_hot_entry(number: str):
    """Open Hot List entry by Taskwarrior number."""
    try:
        # Get UUID from task number
        result = subprocess.run(
            ["task", "_get", f"{number}.uuid"],
            capture_output=True,
            text=True,
            check=True
        )
        uuid = result.stdout.strip()

        # Find corresponding MD file in hotlist_index.json
        json_file = HOT_DIR / "hotlist_index.json"
        if not json_file.exists():
            print("❌ hotlist_index.json not found")
            return 1

        data = json.loads(json_file.read_text(encoding='utf-8'))
        items = data.get("items", []) if isinstance(data, dict) else data

        # Find item by UUID
        for item in items:
            if item.get("tw_uuid") == uuid:
                file_path = Path(item["file"])
                if file_path.exists():
                    # Open with $EDITOR or default
                    editor = os.environ.get("EDITOR", "vim")
                    subprocess.run([editor, str(file_path)])
                    return 0
                else:
                    print(f"❌ File not found: {file_path}")
                    return 1

        print(f"❌ No Hot List entry found for task {number}")
        return 1

    except subprocess.CalledProcessError as e:
        print(f"❌ Taskwarrior error: {e}")
        return 1
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1

    command = sys.argv[1]

    # hot list - show list
    if command == "list":
        return show_hotlist()

    # hot open N - open entry
    if command == "open" and len(sys.argv) == 3:
        return open_hot_entry(sys.argv[2])

    # hot "idea" - add to list
    idea = " ".join(sys.argv[1:])
    return add_to_hotlist(idea)


if __name__ == "__main__":
    sys.exit(main())
