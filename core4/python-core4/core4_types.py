"""
core4_types.py — Constants, Target dataclass, and base helpers.
No dependencies on other core4_* modules.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional
from zoneinfo import ZoneInfo


HABIT_ALIASES = {
    "partner": "person1",
    "posterity": "person2",
    "person_1": "person1",
    "person-1": "person1",
    "person_2": "person2",
    "person-2": "person2",
    "learn": "discover",
    "action": "declare",
}

VALID_HABITS = {
    "fitness",
    "fuel",
    "meditation",
    "memoirs",
    "person1",
    "person2",
    "discover",
    "declare",
}

HABIT_TO_DOMAIN = {
    "fitness": "body",
    "fuel": "body",
    "meditation": "being",
    "memoirs": "being",
    "person1": "balance",
    "person2": "balance",
    "discover": "business",
    "declare": "business",
}

DISPLAY_HABIT = {
    "person1": "person1",
    "person2": "person2",
}

HABIT_ORDER = ["fitness", "fuel", "meditation", "memoirs", "person1", "person2", "discover", "declare"]
DOMAIN_ORDER = ["body", "being", "balance", "business"]

HABIT_PROMPTS = {
    "fitness": "Did you sweat today?",
    "fuel": "Did you fuel your body?",
    "meditation": "Did you meditate?",
    "memoirs": "Did you write memoirs?",
    "person1": "Did you invest in Person 1?",
    "person2": "Did you invest in Person 2?",
    "discover": "Did you discover?",
    "declare": "Did you declare?",
}

DEFAULT_VAULT_DIR = Path.home() / "vault"
BRIDGE_URL = os.environ.get("AOS_BRIDGE_URL", "http://127.0.0.1:8080").rstrip("/")
TZ = ZoneInfo(os.environ.get("AOS_TZ", "Europe/Vienna"))


def _resolve_core4ctl_path() -> Path:
    default_path = (Path(__file__).resolve().parent / "core4ctl").expanduser()
    env_value = os.environ.get("AOS_CORE4CTL", "").strip()
    if not env_value:
        return default_path
    env_path = Path(env_value).expanduser()
    # Be tolerant of stale shell env vars after path refactors.
    if env_path.exists():
        return env_path
    return default_path if default_path.exists() else env_path


CORE4CTL = _resolve_core4ctl_path()
CORE4_JOURNAL_DIR = Path(
    os.environ.get("CORE4_JOURNAL_DIR")
    or os.environ.get("AOS_CORE4_JOURNAL_DIR")
    or (DEFAULT_VAULT_DIR / "Alpha_Journal" / "Entries")
).expanduser()


def week_key(day: date) -> str:
    iso = day.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def normalize_habit(raw: str) -> str:
    v = str(raw or "").strip().lower()
    v = HABIT_ALIASES.get(v, v)
    if v not in VALID_HABITS:
        raise ValueError(f"unknown habit: {raw}")
    return v


def parse_day(value: Optional[str]) -> date:
    if not value:
        return date.today()
    v = value.strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
        return datetime.strptime(v, "%Y-%m-%d").date()
    if re.fullmatch(r"-\d+d", v):
        n = int(v[1:-1])
        return date.today() - timedelta(days=n)
    raise ValueError(f"invalid date: {value}")


def resolve_target(habit_raw: str, day_raw: Optional[str]) -> "Target":
    habit = normalize_habit(habit_raw)
    domain = HABIT_TO_DOMAIN.get(habit, "")
    if not domain:
        raise ValueError(f"cannot infer domain for habit: {habit}")
    day = parse_day(day_raw)
    return Target(habit=habit, domain=domain, day=day)


@dataclass(frozen=True)
class Target:
    habit: str
    domain: str
    day: date

    @property
    def date_key(self) -> str:
        return self.day.isoformat()

    @property
    def entry_key(self) -> str:
        return f"{self.date_key}:{self.domain}:{self.habit}"

    @property
    def date_tag(self) -> str:
        return f"core4_{self.day.strftime('%Y%m%d')}"

    @property
    def tw_habit_primary_tag(self) -> str:
        # TickTick sync script uses partner/posterity (not person1/person2).
        if self.habit == "person1":
            return "partner"
        if self.habit == "person2":
            return "posterity"
        return self.habit

    @property
    def tw_habit_tags(self) -> list[str]:
        # Keep both canonical + legacy tags for compatibility across scripts.
        if self.habit == "person1":
            return ["partner", "person1"]
        if self.habit == "person2":
            return ["posterity", "person2"]
        return [self.habit]
