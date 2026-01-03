#!/usr/bin/env python3
"""
Push Taskwarrior Door UUIDs to TickTick project descriptions.
Pattern: Reuse ticktick_sync.py's API client.
"""

import argparse
import json
import os
import sys
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

BASE_URL = "https://api.ticktick.com/open/v1"

def ticktick_token() -> str:
    """Get TickTick API token from environment or file"""
    token = os.getenv("TICKTICK_TOKEN", "").strip()
    if token:
        return token
    token_file = Path.home() / ".ticktick_token"
    if token_file.exists():
        return token_file.read_text(encoding="utf-8").strip()
    raise ValueError("TICKTICK_TOKEN not found (set env var or ~/.ticktick_token file)")

def update_project_description(project_id: str, door_uuid: str) -> bool:
    """Update TickTick project description with TW UUID"""
    try:
        token = ticktick_token()
    except ValueError as e:
        print(f"✗ Error: {e}", file=sys.stderr)
        return False

    try:
        # Get current project
        req = Request(f"{BASE_URL}/project/{project_id}")
        req.add_header("Authorization", f"Bearer {token}")

        with urlopen(req) as response:
            project = json.loads(response.read())

        # Get project name to construct markdown file link
        project_name = project.get("name", "")

        # Append UUID and markdown file link to description
        current_desc = project.get("description", "")

        # Check if UUID already exists
        if f"Taskwarrior Door UUID: {door_uuid}" in current_desc:
            print(f"✓ UUID already synced: {door_uuid}")
            return True

        # Construct markdown file link (assuming it's in War-Stacks folder)
        md_file_link = f"obsidian://open?vault=AlphaOS-Vault&file=Door/War-Stacks/{project_name.replace(' ', '%20')}.md"

        new_desc = f"{current_desc}\n\nTaskwarrior Door UUID: {door_uuid}\nObsidian File: {md_file_link}".strip()

        # Update project
        data = json.dumps({"description": new_desc}).encode("utf-8")
        req = Request(f"{BASE_URL}/project/{project_id}", data=data, method="POST")
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("Content-Type", "application/json")

        with urlopen(req) as response:
            if response.status == 200:
                print(f"✓ UUID synced: {door_uuid} → TickTick project {project_id}")
                return True
            else:
                print(f"✗ Unexpected status: {response.status}", file=sys.stderr)
                return False

    except HTTPError as e:
        print(f"✗ HTTP Error: {e.code} {e.reason}", file=sys.stderr)
        if e.code == 401:
            print("  (Check TICKTICK_TOKEN validity)", file=sys.stderr)
        return False
    except URLError as e:
        print(f"✗ Network Error: {e.reason}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"✗ Error: {e}", file=sys.stderr)
        return False

def main():
    parser = argparse.ArgumentParser(description="Sync Taskwarrior Door UUID to TickTick project")
    parser.add_argument("--door-uuid", required=True, help="Taskwarrior Door UUID")
    parser.add_argument("--ticktick-id", required=True, help="TickTick project ID")
    args = parser.parse_args()

    success = update_project_description(args.ticktick_id, args.door_uuid)
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
