#!/usr/bin/env python3
"""Compatibility wrapper for canonical Fire engine under game/fire/."""

from __future__ import annotations

import runpy
from pathlib import Path


CANONICAL_FILE = Path(__file__).resolve().parents[1] / "fire" / "firemap.py"

globals().update(runpy.run_path(str(CANONICAL_FILE), run_name=__name__))
