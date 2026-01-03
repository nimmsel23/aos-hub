#!/usr/bin/env python3
"""Mark today's Core4 task as done by keyword."""

import json
import os
import subprocess
import sys
from datetime import datetime


TASK_BIN = os.environ.get("AOS_TASK_BIN", "task")
CORE4_KEYS = [
    "fitness",
    "fuel",
    "meditation",
    "memoirs",
    "partner",
    "posterity",
    "discover",
    "declare",
]


def usage() -> None:
    print("Usage: core4_done_wrapper.py \"Fuel done\"")


def run_task(args):
    return subprocess.run(args, capture_output=True, text=True, check=True)


def main() -> int:
    if len(sys.argv) != 2:
        usage()
        return 1

    command = sys.argv[1].strip().lower()
    matched = [k for k in CORE4_KEYS if k in command]
    if not matched or not command.endswith("done"):
        print("ERR: invalid Core4 command (expected '<key> done').")
        return 1

    keyword = matched[0]
    today = datetime.now().strftime("%Y-%m-%d")

    try:
        result = run_task([TASK_BIN, "status:pending", "due:today", "export"])
        tasks = json.loads(result.stdout) if result.stdout.strip() else []
    except Exception as exc:
        print(f"ERR: task query failed: {exc}")
        return 1

    task_id = None
    for task in tasks:
        desc = str(task.get("description", "")).lower()
        if keyword in desc:
            task_id = task.get("id") or task.get("uuid")
            break

    if not task_id:
        print(f"WARN: no task found for '{keyword}' on {today}.")
        return 0

    try:
        run_task([TASK_BIN, str(task_id), "done"])
        print(f"OK: marked '{keyword}' done (id {task_id}).")
        return 0
    except Exception as exc:
        print(f"ERR: failed to mark done: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
