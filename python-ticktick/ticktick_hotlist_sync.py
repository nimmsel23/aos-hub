#!/usr/bin/env python3
"""
TickTick → Hot List Sync (1-Potential)

Syncs TickTick tasks to individual .md files + Taskwarrior + hotlist_index.json.
Replaces Obsidian TickTick Plugin (which dumps everything in one file).

For each TickTick task:
1. Create separate .md file (clean format, no annoying tags)
2. Create Taskwarrior task → get UUID
3. Add entry to hotlist_index.json with UUID

Usage:
    ticktick_hotlist_sync.py --sync     # Sync TickTick → .md + Taskwarrior + JSON
    ticktick_hotlist_sync.py --status   # Show current status

Environment:
    TICKTICK_TOKEN               # TickTick API token
    HOT_TICKTICK_PROJECT_ID      # TickTick project ID (default: inbox)
    HOT_TICKTICK_TAG             # TickTick tag to filter (default: hot)
    ALPHAOS_VAULT                # AlphaOS Vault path (default: ~/AlphaOS-Vault)
"""

from __future__ import annotations

import argparse
import json
import os
import re
import secrets
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from urllib.request import Request, urlopen


BASE_URL = "https://api.ticktick.com/open/v1"
LOG_PATH = Path.home() / ".local" / "share" / "alphaos" / "logs" / "ticktick_hotlist.log"
HOT_PROJECT = "HotList"


def log_line(message: str) -> None:
    """Log message to file with timestamp."""
    try:
        LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with LOG_PATH.open("a", encoding="utf-8") as handle:
            handle.write(f"[{ts}] {message}\n")
    except Exception:
        return


def vault_path() -> Path:
    """Get AlphaOS Vault path from env or default."""
    vault_str = os.getenv("ALPHAOS_VAULT", "").strip()
    if vault_str:
        return Path(vault_str).expanduser()
    return Path.home() / "AlphaOS-Vault"


def hot_dir() -> Path:
    """Get 1-Potential directory path."""
    return vault_path() / "Door" / "1-Potential"


def hotlist_json_path() -> Path:
    """Get hotlist_index.json path (Source of Truth)."""
    return hot_dir() / "hotlist_index.json"


def ticktick_token() -> Optional[str]:
    """Get TickTick API token from env or file."""
    token = os.getenv("TICKTICK_TOKEN", "").strip()
    if token:
        return token
    token_file = Path.home() / ".ticktick_token"
    if token_file.exists():
        try:
            return token_file.read_text(encoding="utf-8").strip()
        except Exception:
            return None
    return None


def ticktick_project_id() -> str:
    """Get TickTick project ID to sync from."""
    return (
        os.getenv("HOT_TICKTICK_PROJECT_ID", "").strip()
        or os.getenv("TICKTICK_PROJECT_ID", "").strip()
        or "inbox"
    )


def ticktick_filter_tag() -> str:
    """Get TickTick tag to filter by."""
    return os.getenv("HOT_TICKTICK_TAG", "hot").strip()


def ticktick_request(endpoint: str, method: str = "GET", payload: Optional[Dict] = None) -> Dict:
    """Make authenticated TickTick API request."""
    token = ticktick_token()
    if not token:
        raise RuntimeError("Missing TICKTICK_TOKEN")
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method=method,
    )
    with urlopen(req, timeout=10) as resp:
        body = resp.read().decode("utf-8")
    try:
        return json.loads(body)
    except Exception:
        return {"raw": body}


def ticktick_fetch_tasks() -> List[Dict]:
    """Fetch tasks from TickTick project."""
    try:
        project_id = ticktick_project_id()
        data = ticktick_request(f"/task?projectId={project_id}", "GET")
    except Exception as e:
        log_line(f"TickTick fetch failed: {e}")
        return []
    return data if isinstance(data, list) else []


def load_hotlist_json() -> Dict:
    """Load existing hotlist_index.json."""
    path = hotlist_json_path()
    if not path.exists():
        return {"items": []}
    try:
        content = json.loads(path.read_text(encoding="utf-8"))
        # Normalize to {items: [...]} format
        if isinstance(content, list):
            return {"items": content}
        elif isinstance(content, dict) and "items" in content:
            return content
        return {"items": []}
    except Exception as e:
        log_line(f"Load hotlist_index.json failed: {e}")
        return {"items": []}


def save_hotlist_json(data: Dict) -> None:
    """Save hotlist_index.json."""
    path = hotlist_json_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        log_line(f"Saved hotlist_index.json with {len(data.get('items', []))} items")
    except Exception as e:
        log_line(f"Save hotlist_index.json failed: {e}")
        raise


def make_slug(text: str, max_length: int = 50) -> str:
    """Create URL-safe slug from text."""
    slug = text.lower()
    slug = re.sub(r'[^a-z0-9\s\-]', '', slug)
    slug = re.sub(r'\s+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')
    return slug[:max_length] if slug else "hot"


def create_markdown_file(idea: str, ticktick_id: str, tw_uuid: str) -> Path:
    """Create individual markdown file for hot idea."""
    slug = make_slug(idea)
    uuid_prefix = secrets.token_hex(2)  # 4-char hex (e.g., "a7f2")
    filename = f"{uuid_prefix}-{slug}.md"
    file_path = hot_dir() / filename

    # Create directory if needed
    hot_dir().mkdir(parents=True, exist_ok=True)

    # ISO timestamp
    iso = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
    day = datetime.now().strftime("%Y-%m-%d")
    hm = datetime.now().strftime("%H:%M")

    # Write markdown (minimal format)
    content = f"""---
tw_uuid: {tw_uuid}
---

# 🔥 {idea}
"""

    file_path.write_text(content, encoding="utf-8")
    log_line(f"Created markdown: {filename}")
    return file_path


def create_taskwarrior_task(idea: str) -> Optional[str]:
    """Create Taskwarrior task and return UUID."""
    try:
        # Add task to Taskwarrior
        cmd = [
            "task", "add",
            f"project:{HOT_PROJECT}",
            "prio:L",
            "+hot",
            "+potential",
            idea
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)

        # Extract task ID from output (e.g., "Created task 123.")
        match = re.search(r'Created task (\d+)', result.stdout)
        if not match:
            log_line(f"Could not extract task ID from: {result.stdout}")
            return None

        task_id = match.group(1)

        # Get UUID using task _get
        uuid_result = subprocess.run(
            ["task", "_get", f"{task_id}.uuid"],
            capture_output=True,
            text=True,
            check=True
        )
        uuid = uuid_result.stdout.strip()

        if uuid:
            log_line(f"Created Taskwarrior task {task_id} with UUID {uuid}")
            return uuid
        return None

    except subprocess.CalledProcessError as e:
        log_line(f"Taskwarrior add failed: {e}")
        return None
    except Exception as e:
        log_line(f"Unexpected error creating Taskwarrior task: {e}")
        return None


def sync_ticktick_to_hotlist() -> Dict:
    """
    Sync TickTick tasks to Hot List.

    For each TickTick task:
    1. Create separate .md file (clean format)
    2. Create Taskwarrior task → get UUID
    3. Add entry to hotlist_index.json with UUID

    Avoids duplicates by checking ticktick_id.
    """
    filter_tag = ticktick_filter_tag()

    # Fetch tasks from TickTick
    all_tasks = ticktick_fetch_tasks()
    log_line(f"Fetched {len(all_tasks)} tasks from TickTick project {ticktick_project_id()}")

    # Filter by tag if specified
    if filter_tag:
        filtered = [
            t for t in all_tasks
            if filter_tag in [tag.lower() for tag in t.get("tags", [])]
        ]
        log_line(f"Filtered to {len(filtered)} tasks with tag '{filter_tag}'")
    else:
        filtered = all_tasks

    # Load existing hotlist
    hotlist = load_hotlist_json()
    items = hotlist.get("items", [])

    # Build set of existing ticktick_ids
    existing_ids = {
        item.get("ticktick_id")
        for item in items
        if item.get("ticktick_id")
    }

    # Process each new task
    added = 0
    skipped = 0
    failed = 0

    for task in filtered:
        ticktick_id = task.get("id", "")
        title = task.get("title", "").strip()

        if not ticktick_id or not title:
            continue

        # Skip if already exists
        if ticktick_id in existing_ids:
            skipped += 1
            continue

        # Create Taskwarrior task
        tw_uuid = create_taskwarrior_task(title)
        if not tw_uuid:
            log_line(f"Skipping '{title}' - Taskwarrior failed")
            failed += 1
            continue

        # Create markdown file
        try:
            md_file = create_markdown_file(title, ticktick_id, tw_uuid)
        except Exception as e:
            log_line(f"Markdown creation failed for '{title}': {e}")
            failed += 1
            continue

        # Add to JSON
        iso = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
        entry = {
            "idea": title,
            "created": iso,
            "file": str(md_file),
            "ticktick_id": ticktick_id,
            "tw_uuid": tw_uuid,
            "status": "active",
            "quadrant": 2,
            "tags": ["hot", "potential"]
        }

        items.append(entry)
        existing_ids.add(ticktick_id)
        added += 1

    # Save updated JSON
    hotlist["items"] = items
    save_hotlist_json(hotlist)

    log_line(f"Sync complete: {added} added, {skipped} skipped, {failed} failed")

    return {
        "ok": True,
        "fetched": len(all_tasks),
        "filtered": len(filtered),
        "added": added,
        "skipped": skipped,
        "failed": failed,
        "total": len(items)
    }


def show_status() -> None:
    """Show current hotlist status."""
    hotlist = load_hotlist_json()
    items = hotlist.get("items", [])

    print(f"Hotlist JSON: {hotlist_json_path()}")
    print(f"Total items: {len(items)}")

    if items:
        print("\nRecent items:")
        for item in items[-5:]:
            title = item.get("idea", "")
            created = item.get("created", "")
            status = item.get("status", "")
            tw_uuid = item.get("tw_uuid", "")[:8]
            print(f"  - {title[:50]}... (UUID: {tw_uuid}, {status})")

    # Show TickTick config
    print(f"\nTickTick config:")
    print(f"  Project ID: {ticktick_project_id()}")
    print(f"  Filter tag: {ticktick_filter_tag()}")
    print(f"  Token: {'SET' if ticktick_token() else 'MISSING'}")


def main():
    parser = argparse.ArgumentParser(
        description="Sync TickTick tasks to Hot List (.md + Taskwarrior + JSON)"
    )
    parser.add_argument(
        "--sync",
        action="store_true",
        help="Sync TickTick → .md files + Taskwarrior + hotlist_index.json"
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show current status"
    )

    args = parser.parse_args()

    if args.sync:
        print("🔄 Syncing TickTick → Hot List...")
        print("   (creates .md files + Taskwarrior tasks + JSON entries)")
        result = sync_ticktick_to_hotlist()
        print(f"\n✅ Sync complete!")
        print(f"   Fetched: {result['fetched']}")
        print(f"   Filtered: {result['filtered']}")
        print(f"   Added: {result['added']}")
        print(f"   Skipped: {result['skipped']} (already exist)")
        print(f"   Failed: {result['failed']}")
        print(f"   Total: {result['total']}")
    elif args.status:
        show_status()
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
