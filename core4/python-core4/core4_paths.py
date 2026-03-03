"""
core4_paths.py — Path and directory resolution for Core4.
Depends on: core4_types
"""

from __future__ import annotations

import os
import re
from pathlib import Path

from core4_types import DEFAULT_VAULT_DIR, week_key
from datetime import date


def _load_aos_env() -> None:
    """Load /etc/aos/aos.env into os.environ if AOS vars are not already set."""
    env_file = Path("/etc/aos/aos.env")
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val


_load_aos_env()


def core4_dirs() -> list[Path]:
    """
    Return Core4 directories to consider, in priority order (first = primary write target).

    Defaults reflect the "local + gdrive mount" setup:
      - `AOS_CORE4_LOCAL_DIR` (if set)
      - `AOS_CORE4_MOUNT_DIR` (if set)
      - fallback: `vault/Core4` + `vault/Alpha_Core4`

    Override with:
      - `AOS_CORE4_DIR` (single dir)
      - `AOS_CORE4_DIRS` (colon-separated list, priority order)
    """
    vault_dir = Path(os.getenv("AOS_VAULT_DIR", DEFAULT_VAULT_DIR)).expanduser()

    dirs_raw = os.getenv("AOS_CORE4_DIRS", "").strip()
    if dirs_raw:
        dirs = [Path(p).expanduser() for p in dirs_raw.split(":") if p.strip()]
        return [d for d in dirs if str(d).strip()]

    single = os.getenv("AOS_CORE4_DIR", "").strip()
    if single:
        return [Path(single).expanduser()]

    local_dir = os.getenv("AOS_CORE4_LOCAL_DIR", "").strip()
    mount_dir = os.getenv("AOS_CORE4_MOUNT_DIR", "").strip()
    if local_dir or mount_dir:
        merged: list[Path] = []
        for raw in (local_dir, mount_dir):
            if not raw:
                continue
            p = Path(raw).expanduser()
            if p not in merged:
                merged.append(p)
        if merged:
            return merged

    return [vault_dir / "Core4", vault_dir / "Alpha_Core4"]


def primary_core4_dir() -> Path:
    return core4_dirs()[0]


def core4_week_path(day: date) -> Path:
    # Derived artifact written locally (rebuildable). We do NOT treat this as source-of-truth.
    return primary_core4_dir() / f"core4_week_{week_key(day)}.json"


def core4_day_path(day: date) -> Path:
    # Derived artifact written locally (rebuildable).
    return primary_core4_dir() / f"core4_day_{day.isoformat()}.json"


def _core4_store_dir(base_dir: Path, leaf: str) -> Path:
    """
    Resolve Core4 data folders with flat-first semantics and legacy fallback.

    New layout:
      <base>/<leaf>
    Legacy layout:
      <base>/.core4/<leaf>
    """
    flat = base_dir / leaf
    legacy = base_dir / ".core4" / leaf
    if flat.exists():
        return flat
    if legacy.exists():
        return legacy
    return flat


def core4_event_dir(base_dir: Path) -> Path:
    # Append-only event ledger; safe with multiple writers + sync lag.
    return _core4_store_dir(base_dir, "events")


def _safe_filename(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "_", str(value or "").strip())
    return cleaned or "x"


def core4_scores_csv_path() -> Path:
    return primary_core4_dir() / "core4_scores.csv"


def core4_daily_csv_path() -> Path:
    return primary_core4_dir() / "core4_daily.csv"


def core4_monthly_csv_path(month: str) -> Path:
    # e.g. core4_2026-01.csv (daily rows for the month)
    return primary_core4_dir() / f"core4_{month}.csv"


def core4_sealed_dir() -> Path:
    return _core4_store_dir(primary_core4_dir(), "sealed")


def core4_sealed_months_dir() -> Path:
    return _core4_store_dir(primary_core4_dir(), "sealed-months")
