#!/usr/bin/env python3
"""
Watch TickTick tasks for tag changes (#potential → #plan → #production → #profit).
Triggers door_lifecycle.sh for file moves and automation.
"""

import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

BASE_URL = "https://api.ticktick.com/open/v1"
CACHE_FILE = Path.home() / ".local/share/alphaos/ticktick_tag_cache.json"
LOG_FILE = Path.home() / ".local/share/alphaos/logs/ticktick_tag_watcher.log"

def log(msg: str):
    """Log message to file"""
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(f"[{ts}] {msg}\n")

def ticktick_token() -> str:
    """Get TickTick API token from environment or file"""
    token = os.getenv("TICKTICK_TOKEN", "").strip()
    if token:
        return token
    token_file = Path.home() / ".ticktick_token"
    if token_file.exists():
        return token_file.read_text(encoding="utf-8").strip()
    raise ValueError("TICKTICK_TOKEN not found")

def load_cache() -> dict:
    """Load previous state from cache"""
    if CACHE_FILE.exists():
        try:
            return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}

def save_cache(data: dict):
    """Save current state to cache"""
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    CACHE_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")

def fetch_door_tasks() -> list:
    """Fetch all tasks with Door-related tags"""
    try:
        token = ticktick_token()
    except ValueError as e:
        log(f"ERROR: {e}")
        return []

    try:
        # Get tasks from "Potential" project
        req = Request(f"{BASE_URL}/project/Potential/tasks")
        req.add_header("Authorization", f"Bearer {token}")

        with urlopen(req) as response:
            tasks = json.loads(response.read())

        # Filter tasks with lifecycle tags
        door_tasks = []
        for task in tasks:
            tags = task.get("tags", [])
            lifecycle_tags = [t for t in tags if t in ["potential", "plan", "production", "profit"]]
            if lifecycle_tags:
                door_tasks.append({
                    "id": task["id"],
                    "title": task["title"],
                    "tags": lifecycle_tags,
                    "modified": task.get("modifiedTime")
                })

        return door_tasks

    except HTTPError as e:
        log(f"HTTP Error: {e.code} {e.reason}")
        return []
    except URLError as e:
        log(f"Network Error: {e.reason}")
        return []
    except Exception as e:
        log(f"Error fetching tasks: {e}")
        return []

def detect_transitions(old_cache: dict, new_tasks: list) -> list:
    """Detect tag changes (state transitions)"""
    transitions = []

    for task in new_tasks:
        task_id = task["id"]
        new_tag = task["tags"][0] if task["tags"] else None

        old_task = old_cache.get(task_id, {})
        old_tag = old_task.get("tag")

        if old_tag and new_tag and old_tag != new_tag:
            transitions.append({
                "task_id": task_id,
                "title": task["title"],
                "from": old_tag,
                "to": new_tag
            })

    return transitions

def trigger_lifecycle(transition: dict):
    """Call door_lifecycle.sh to handle transition"""
    script = Path.home() / "bin/door_lifecycle.sh"

    if not script.exists():
        log(f"ERROR: door_lifecycle.sh not found at {script}")
        return

    cmd = [
        str(script),
        transition["from"],
        transition["to"],
        transition["task_id"],
        transition["title"]
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        log(f"✓ Transition: {transition['title']}: {transition['from']} → {transition['to']}")
        if result.stdout.strip():
            log(f"  {result.stdout.strip()}")
    except subprocess.CalledProcessError as e:
        log(f"✗ Lifecycle failed: {e.stderr if e.stderr else str(e)}")

def main():
    log("=== Tag Watcher Started ===")

    # Load previous state
    old_cache = load_cache()

    # Fetch current tasks
    tasks = fetch_door_tasks()

    # Build new cache
    new_cache = {
        task["id"]: {"tag": task["tags"][0] if task["tags"] else None}
        for task in tasks
    }

    # Detect transitions
    transitions = detect_transitions(old_cache, tasks)

    # Trigger lifecycle for each transition
    for transition in transitions:
        trigger_lifecycle(transition)

    # Save new cache
    save_cache(new_cache)

    log(f"Checked {len(tasks)} tasks, {len(transitions)} transitions")

if __name__ == "__main__":
    main()
