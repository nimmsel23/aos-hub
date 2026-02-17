"""
Vault path helpers for Game Maps.
Filename convention: DOMAIN_maptype.md  (Node-compatible via scanForMap())

Frame Maps use YAML as primary storage (DOMAIN_frame.yaml) and auto-generate
DOMAIN_frame.md for Node display.
"""

import yaml
from pathlib import Path

VAULT = Path.home() / "AlphaOS-Vault" / "Game"

MAP_DIRS = {
    "frame":   VAULT / "Frame",
    "freedom": VAULT / "Freedom",
    "focus":   VAULT / "Focus",
    "fire":    VAULT / "Fire",
}


def ensure(map_type: str) -> Path:
    """Create vault dir if needed, return it."""
    d = MAP_DIRS[map_type]
    d.mkdir(parents=True, exist_ok=True)
    return d


def map_path(map_type: str, domain: str) -> Path:
    """Return Node-compatible path: DOMAIN_maptype.md"""
    return MAP_DIRS[map_type] / f"{domain.upper()}_{map_type}.md"


def read_map(map_type: str, domain: str) -> str | None:
    p = map_path(map_type, domain)
    return p.read_text(encoding="utf-8") if p.exists() else None


def write_map(map_type: str, domain: str, content: str) -> Path:
    ensure(map_type)
    p = map_path(map_type, domain)
    p.write_text(content, encoding="utf-8")
    return p


def list_maps(map_type: str) -> list[Path]:
    ensure(map_type)
    return sorted(MAP_DIRS[map_type].glob(f"*_{map_type}.md"))


# ── YAML helpers (frame primary storage) ─────────────────────────────────────

def yaml_path(domain: str) -> Path:
    return MAP_DIRS["frame"] / f"{domain.upper()}_frame.yaml"


def write_frame_yaml(domain: str, data: dict) -> Path:
    """Save frame data as YAML (primary storage)."""
    ensure("frame")
    p = yaml_path(domain)
    p.write_text(yaml.dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return p


def read_frame_yaml(domain: str) -> dict | None:
    p = yaml_path(domain)
    if not p.exists():
        return None
    return yaml.safe_load(p.read_text(encoding="utf-8"))


def list_frame_yamls() -> list[Path]:
    ensure("frame")
    return sorted(MAP_DIRS["frame"].glob("*_frame.yaml"))
