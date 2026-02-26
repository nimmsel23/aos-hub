#!/usr/bin/env python3
"""Compatibility wrapper for canonical Fire bot under game/fire/."""

from __future__ import annotations

import runpy
import sys
from pathlib import Path


CANONICAL_DIR = Path(__file__).resolve().parents[1] / "fire"
CANONICAL_FILE = CANONICAL_DIR / "firemap_bot.py"

if str(CANONICAL_DIR) not in sys.path:
    sys.path.insert(0, str(CANONICAL_DIR))

if __name__ == "__main__":
    runpy.run_path(str(CANONICAL_FILE), run_name="__main__")
else:
    globals().update(runpy.run_path(str(CANONICAL_FILE), run_name=__name__))
