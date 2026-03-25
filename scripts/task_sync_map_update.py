#!/usr/bin/env python3
import json
import os
import re
from datetime import datetime

SYNC_ID_RE = re.compile(r"SYNC-ID:\s*([a-z0-9\-]+)", re.IGNORECASE)


def load_json(path, default):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default
    except json.JSONDecodeError:
        return default


def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def extract_sync_id(text):
    if not text:
        return None
    match = SYNC_ID_RE.search(text)
    return match.group(1) if match else None


def task_sync_id(task):
    sync_id = extract_sync_id(task.get("description", ""))
    if sync_id:
        return sync_id
    for ann in task.get("annotations", []) or []:
        sync_id = extract_sync_id(ann.get("description", ""))
        if sync_id:
            return sync_id
    return None


def tag_match(tags, sync_tags):
    return any(tag in sync_tags for tag in (tags or []))


def main():
    task_export_path = os.environ.get(
        "TASK_EXPORT", os.path.expanduser("~/.local/share/alphaos/task_export.json")
    )
    sync_map_path = os.environ.get(
        "SYNC_MAP", os.path.expanduser("~/.local/share/alphaos/task_sync_map.json")
    )
    sync_tags = os.environ.get("SYNC_TAGS", "door,hit,strike,core4").split(",")
    sync_tags = [t.strip() for t in sync_tags if t.strip()]

    tasks = load_json(task_export_path, [])
    if not isinstance(tasks, list):
        tasks = []

    sync_map = load_json(sync_map_path, [])
    if not isinstance(sync_map, list):
        sync_map = []

    index = {entry.get("syncId"): entry for entry in sync_map if entry.get("syncId")}
    updated = 0
    created = 0

    for task in tasks:
        if not tag_match(task.get("tags", []), sync_tags):
            continue
        sync_id = task_sync_id(task)
        if not sync_id:
            continue

        entry = index.get(sync_id)
        if not entry:
            entry = {
                "syncId": sync_id,
                "scope": "taskwarrior",
                "createdAt": datetime.utcnow().isoformat() + "Z",
            }
            sync_map.append(entry)
            index[sync_id] = entry
            created += 1

        entry["taskwarriorUuid"] = task.get("uuid", "")
        entry["taskwarriorModified"] = task.get("modified", "")
        entry["taskwarriorStatus"] = task.get("status", "")
        entry["tags"] = task.get("tags", [])
        entry["updatedAt"] = datetime.utcnow().isoformat() + "Z"
        updated += 1

    save_json(sync_map_path, sync_map)
    print(f"sync-map updated: {updated} entries (created {created})")


if __name__ == "__main__":
    main()
