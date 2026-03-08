#!/usr/bin/env python3
"""Core4 CLI entrypoint.

Thin wrapper around tracker.main so tooling can target `core4.py`
while tracker implementation stays in `tracker.py`.
"""

from __future__ import annotations

import sys

from tracker import main


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
