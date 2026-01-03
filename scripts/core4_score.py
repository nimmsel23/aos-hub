#!/usr/bin/env python3
"""Compute weekly Core4 score from Bridge JSON and write a JSON summary."""

from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from urllib import request, parse


BRIDGE_URL = os.environ.get("AOS_BRIDGE_URL", "http://127.0.0.1:8080").rstrip("/")
CORE4_DIR = Path(
    os.environ.get("AOS_CORE4_DIR", Path.home() / "AlphaOS-Vault" / "Alpha_Core4")
).expanduser()


def week_key(dt: datetime) -> str:
    year, week, _ = dt.isocalendar()
    return f"{year}-W{week:02d}"


def fetch_core4_week(week: str) -> dict:
    url = f"{BRIDGE_URL}/bridge/core4/week?" + parse.urlencode({"week": week})
    with request.urlopen(url, timeout=6) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    return payload.get("data") or {"week": week, "entries": [], "totals": {}}


def compute_score(data: dict) -> dict:
    entries = data.get("entries") or []
    points = sum(float(e.get("points", 0)) for e in entries)
    return {
        "week": data.get("week"),
        "points": points,
        "score": f"{points:.1f} / 28",
        "entries_count": len(entries),
        "totals": data.get("totals") or {},
        "updated_at": data.get("updated_at") or "",
        "source": "bridge",
    }


def main() -> int:
    now = datetime.now()
    week = week_key(now)
    data = fetch_core4_week(week)
    summary = compute_score(data)

    CORE4_DIR.mkdir(parents=True, exist_ok=True)
    out_path = CORE4_DIR / f"core4_score_{week}.json"
    out_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
