"""
Door Vault helpers — paths + Taskwarrior backend.
Adapted from alpha_door_module.py (legacy).

Vault structure:
  ~/vault/Door/1-Potential/   Hot List (monthly md log)
  ~/vault/Door/War-Stacks/    War Stacks (KW-based YAML)
  ~/vault/Door/3-Production/  Hit List exports
  ~/vault/Door/4-Profit/      Achieved exports
"""

import json
import subprocess
import yaml
from datetime import date, datetime, timedelta
from pathlib import Path

VAULT = Path.home() / "vault" / "Door"

DIRS = {
    "potential":   VAULT / "1-Potential",
    "warstacks":   VAULT / "War-Stacks",
    "production":  VAULT / "3-Production",
    "profit":      VAULT / "4-Profit",
}


def ensure(key: str) -> Path:
    d = DIRS[key]
    d.mkdir(parents=True, exist_ok=True)
    return d


# ── Taskwarrior ───────────────────────────────────────────────────────────────

def task(args: list[str]) -> tuple[bool, str, list[dict]]:
    """Run taskwarrior command. Returns (ok, stdout, tasks_if_export)."""
    try:
        result = subprocess.run(["task"] + args, capture_output=True, text=True, check=True)
        tasks = []
        if "export" in args and result.stdout.strip():
            try:
                tasks = json.loads(result.stdout)
            except json.JSONDecodeError:
                pass
        return True, result.stdout, tasks
    except subprocess.CalledProcessError as e:
        return False, e.stderr or str(e), []


def task_age(entry_date: str) -> str:
    """Human-readable age from taskwarrior entry timestamp."""
    if not entry_date:
        return ""
    try:
        entry = datetime.fromisoformat(entry_date.replace("Z", "+00:00"))
        age = datetime.now(entry.tzinfo) - entry
        if age.days > 0:
            return f"{age.days}d"
        elif age.seconds > 3600:
            return f"{age.seconds // 3600}h"
        return f"{age.seconds // 60}m"
    except Exception:
        return ""


# ── War Stack YAML ────────────────────────────────────────────────────────────

def current_week() -> str:
    iso = date.today().isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


def warstack_path(door_name: str, week: str | None = None) -> Path:
    week = week or current_week()
    slug = door_name.lower().replace(" ", "_")
    return ensure("warstacks") / f"warstack_{week}_{slug}.yaml"


def write_warstack(door_name: str, data: dict, week: str | None = None) -> Path:
    p = warstack_path(door_name, week)
    p.write_text(yaml.dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return p


def read_warstack(door_name: str, week: str | None = None) -> dict | None:
    p = warstack_path(door_name, week)
    if not p.exists():
        return None
    return yaml.safe_load(p.read_text(encoding="utf-8"))


def list_warstacks(week: str | None = None) -> list[Path]:
    ensure("warstacks")
    pattern = f"warstack_{week or '*'}_*.yaml"
    return sorted(DIRS["warstacks"].glob(pattern))


# ── Hot List log ──────────────────────────────────────────────────────────────

def hotlist_log_path() -> Path:
    month = date.today().strftime("%Y-%m")
    return ensure("potential") / f"hotlist_{month}.md"


def append_hotlist_log(domain: str, idea: str):
    """Append idea to monthly hot list markdown log."""
    p = hotlist_log_path()
    if not p.exists():
        p.write_text(f"# Hot List – {date.today().strftime('%B %Y')}\n\n", encoding="utf-8")
    ts = datetime.now().strftime("%m-%d %H:%M")
    with open(p, "a", encoding="utf-8") as f:
        f.write(f"- [{ts}] **{domain}**: {idea}\n")
