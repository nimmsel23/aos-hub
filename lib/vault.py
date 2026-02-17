"""
Vault path helpers for Game Maps.
YAML = source of truth for Node + scripts.

Naming convention:
  frame_{KW}.yaml      e.g. frame_2026-W08.yaml   (weekly)
  freedom_{year}.yaml  e.g. freedom_2026.yaml      (annual)
  focus_{month}.yaml   e.g. focus_2026-02.yaml     (monthly)
  fire_{KW}.yaml       e.g. fire_2026-W08.yaml     (weekly)
"""

import yaml
from datetime import date
from pathlib import Path

VAULT = Path.home() / "AlphaOS-Vault" / "Game"

MAP_DIRS = {
    "frame":   VAULT / "Frame",
    "freedom": VAULT / "Freedom",
    "focus":   VAULT / "Focus",
    "fire":    VAULT / "Fire",
}


# ── Period helpers ────────────────────────────────────────────────────────────

def current_week() -> str:
    iso = date.today().isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


def current_month() -> str:
    return date.today().strftime("%Y-%m")


def current_year() -> str:
    return str(date.today().year)


PERIOD_FN = {
    "frame":   current_week,
    "fire":    current_week,
    "focus":   current_month,
    "freedom": current_year,
}


# ── Path helpers ──────────────────────────────────────────────────────────────

def ensure(map_type: str) -> Path:
    d = MAP_DIRS[map_type]
    d.mkdir(parents=True, exist_ok=True)
    return d


def yaml_path(map_type: str, period: str) -> Path:
    return MAP_DIRS[map_type] / f"{map_type}_{period}.yaml"


def current_yaml_path(map_type: str) -> Path:
    return yaml_path(map_type, PERIOD_FN[map_type]())


# ── Read / Write ──────────────────────────────────────────────────────────────

def write_yaml(map_type: str, data: dict, period: str | None = None) -> Path:
    """Write YAML state. Uses current period if not specified."""
    ensure(map_type)
    period = period or PERIOD_FN[map_type]()
    p = yaml_path(map_type, period)
    p.write_text(yaml.dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return p


def read_yaml(map_type: str, period: str | None = None) -> dict | None:
    """Read YAML state. Uses current period if not specified."""
    period = period or PERIOD_FN[map_type]()
    p = yaml_path(map_type, period)
    if not p.exists():
        return None
    return yaml.safe_load(p.read_text(encoding="utf-8"))


def read_latest_yaml(map_type: str) -> tuple[str, dict] | None:
    """Read the most recently written YAML state. Returns (period, data)."""
    ensure(map_type)
    files = sorted(MAP_DIRS[map_type].glob(f"{map_type}_*.yaml"))
    if not files:
        return None
    f = files[-1]
    period = f.stem[len(map_type) + 1:]
    return period, yaml.safe_load(f.read_text(encoding="utf-8"))


def list_yamls(map_type: str) -> list[Path]:
    ensure(map_type)
    return sorted(MAP_DIRS[map_type].glob(f"{map_type}_*.yaml"))


# ── Domain update (patch single domain in existing YAML) ─────────────────────

def update_domain_yaml(map_type: str, domain: str, domain_data: dict, period: str | None = None) -> Path:
    """Load existing YAML, update one domain section, save back."""
    period = period or PERIOD_FN[map_type]()
    existing = read_yaml(map_type, period) or {"period": period, "date": date.today().isoformat(), "domains": {}}
    existing.setdefault("domains", {})[domain.upper()] = domain_data
    return write_yaml(map_type, existing, period)


# ── Cascade helpers ───────────────────────────────────────────────────────────

def read_freedom_anchor(year: str | None = None) -> str | None:
    """Extract the vision text from freedom YAML for Focus anchor."""
    result = read_yaml("freedom", year or current_year())
    if not result:
        return None
    domains = result.get("domains", {})
    anchors = []
    for domain, data in domains.items():
        vision = (data or {}).get("vision", "")
        if vision and vision != "(—)":
            anchors.append(f"{domain}: {vision}")
    return "\n".join(anchors) if anchors else None
