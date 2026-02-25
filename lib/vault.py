"""
Vault path helpers for Game Maps.
YAML snapshots use a fixed canonical filename per map plus append-only history.

Canonical examples:
  annual_frame.yaml
  quarterly_freedom.yaml
  monthly_focus.yaml
  weekly_fire.yaml

History examples (auto-written on each save):
  _history/frame_2026-W09__20260225T184000Z.yaml
"""

import yaml
from datetime import date, datetime, timezone
from pathlib import Path

VAULT = Path.home() / "AlphaOS-Vault" / "Game"

MAP_DIRS = {
    "frame":   VAULT / "Frame",
    "freedom": VAULT / "Freedom",
    "focus":   VAULT / "Focus",
    "fire":    VAULT / "Fire",
}

CANONICAL_YAML_NAMES = {
    "frame": "annual_frame.yaml",
    "freedom": "quarterly_freedom.yaml",
    "focus": "monthly_focus.yaml",
    "fire": "weekly_fire.yaml",
}

HISTORY_DIRNAME = "_history"


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
    """Compatibility helper: logical period path (legacy style name)."""
    return MAP_DIRS[map_type] / f"{map_type}_{period}.yaml"


def canonical_yaml_path(map_type: str) -> Path:
    ensure(map_type)
    return MAP_DIRS[map_type] / CANONICAL_YAML_NAMES.get(map_type, f"{map_type}.yaml")


def history_dir(map_type: str) -> Path:
    ensure(map_type)
    d = MAP_DIRS[map_type] / HISTORY_DIRNAME
    d.mkdir(parents=True, exist_ok=True)
    return d


def _history_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _history_snapshot_path(map_type: str, period: str, stamp: str | None = None) -> Path:
    stamp = stamp or _history_stamp()
    base = history_dir(map_type) / f"{map_type}_{period}__{stamp}.yaml"
    if not base.exists():
        return base
    n = 1
    while True:
        p = history_dir(map_type) / f"{map_type}_{period}__{stamp}_{n}.yaml"
        if not p.exists():
            return p
        n += 1


def current_yaml_path(map_type: str) -> Path:
    return canonical_yaml_path(map_type)


# ── Read / Write ──────────────────────────────────────────────────────────────

def write_yaml(map_type: str, data: dict, period: str | None = None) -> Path:
    """Write canonical YAML snapshot and append a timestamped history snapshot."""
    ensure(map_type)
    period = period or PERIOD_FN[map_type]()
    text = yaml.dump(data, allow_unicode=True, sort_keys=False)

    p = canonical_yaml_path(map_type)
    p.write_text(text, encoding="utf-8")

    hist = _history_snapshot_path(map_type, period)
    hist.write_text(text, encoding="utf-8")
    return p


def read_yaml(map_type: str, period: str | None = None) -> dict | None:
    """
    Read YAML state.
    - period=None: canonical snapshot
    - period=...: latest history snapshot for that period (falls back to canonical if matching)
    """
    if period is None:
        p = canonical_yaml_path(map_type)
        if not p.exists():
            return None
        return yaml.safe_load(p.read_text(encoding="utf-8"))

    candidates = sorted(history_dir(map_type).glob(f"{map_type}_{period}__*.yaml"))
    if candidates:
        p = candidates[-1]
        return yaml.safe_load(p.read_text(encoding="utf-8"))

    # Legacy fallback (old period file layout)
    legacy = yaml_path(map_type, period)
    if legacy.exists():
        return yaml.safe_load(legacy.read_text(encoding="utf-8"))

    # Canonical fallback if it currently represents the requested period.
    canonical = canonical_yaml_path(map_type)
    if canonical.exists():
        data = yaml.safe_load(canonical.read_text(encoding="utf-8"))
        if str((data or {}).get("period", "")).strip() == str(period):
            return data
    return None


def read_latest_yaml(map_type: str) -> tuple[str, dict] | None:
    """Read canonical YAML state first, otherwise latest history snapshot."""
    p = canonical_yaml_path(map_type)
    if p.exists():
        data = yaml.safe_load(p.read_text(encoding="utf-8"))
        period = str((data or {}).get("period", "")).strip() or PERIOD_FN[map_type]()
        return period, data

    files = sorted(history_dir(map_type).glob(f"{map_type}_*__*.yaml"))
    if not files:
        return None
    f = files[-1]
    data = yaml.safe_load(f.read_text(encoding="utf-8"))
    period = str((data or {}).get("period", "")).strip()
    if not period:
        stem = f.stem
        body = stem[len(map_type) + 1:]
        period = body.split("__", 1)[0]
    return period, data


def list_yamls(map_type: str) -> list[Path]:
    ensure(map_type)
    files = sorted(history_dir(map_type).glob(f"{map_type}_*__*.yaml"))
    if files:
        return files
    # Fallback for older layout and/or canonical-only setup.
    legacy = sorted(MAP_DIRS[map_type].glob(f"{map_type}_*.yaml"))
    canonical = canonical_yaml_path(map_type)
    if canonical.exists() and canonical not in legacy:
        legacy.append(canonical)
    return legacy


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
