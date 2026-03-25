#!/usr/bin/env python3
"""
Shared Session Logger Helper

Pure base class: file I/O + state management only.
No domain logic, no parsing - that belongs to gemini_processor.py.

Flow: Telegram Freetext → append_raw() → Dropfile → Gemini → Journal + Telegram
"""

import sys
from datetime import datetime
from pathlib import Path


class SessionLogger:
    """Base class: raw freetext storage + state. Nothing else."""

    def __init__(self, project_dir: str, daily_prefix: str, dropfile_name: str):
        """
        Args:
            project_dir: Relative to ~/ (e.g. "vital-hub/entspannungsctx")
            daily_prefix: Prefix for daily files (e.g. "entspannung")
            dropfile_name: Dropfile name (e.g. "ENTSPANNUNG.md")
        """
        self.project_dir = Path.home() / project_dir
        self.daily_prefix = daily_prefix
        self.dropfile_name = dropfile_name
        self.dropfile = self.project_dir / dropfile_name
        self.state_file = self.project_dir / ".last_update_id"

    def get_today_file(self) -> Path:
        today = datetime.now().strftime("%Y-%m-%d")
        return self.project_dir / f"{self.daily_prefix}-{today}.md"

    def append_raw(self, text: str) -> bool:
        """
        Append raw freetext to today's daily file with timestamp.
        Always succeeds or fails silently (failsafe).
        """
        try:
            today_file = self.get_today_file()

            if not today_file.exists():
                today = datetime.now().strftime("%Y-%m-%d")
                today_file.write_text(f"# {self.daily_prefix.upper()} - {today}\n\n")

            timestamp = datetime.now().strftime("%H:%M:%S")
            with open(today_file, "a") as f:
                f.write(f"- [{timestamp}] {text}\n")

            return True
        except Exception as e:
            print(f"❌ append_raw failed: {e}", file=sys.stderr)
            return False

    def read_today(self) -> str:
        """Read today's raw file content. Empty string if not found."""
        today_file = self.get_today_file()
        return today_file.read_text() if today_file.exists() else ""

    def get_last_update_id(self) -> int:
        """Read last processed Telegram update ID (for dedup polling)."""
        try:
            if self.state_file.exists():
                return int(self.state_file.read_text().strip())
        except Exception:
            pass
        return 0

    def save_last_update_id(self, update_id: int):
        """Persist last processed update ID so next poll skips old messages."""
        self.state_file.write_text(str(update_id))

    def append_message(self, text: str) -> bool:
        """Alias for append_raw - used by domain bots."""
        return self.append_raw(text)


class EntspannungsLogger(SessionLogger):
    def __init__(self):
        super().__init__(
            project_dir="vital-hub/entspannungsctx",
            daily_prefix="entspannung",
            dropfile_name="ENTSPANNUNG.md"
        )


class FitnessLogger(SessionLogger):
    def __init__(self):
        super().__init__(
            project_dir="vital-hub/fitnessctx",
            daily_prefix="fitness",
            dropfile_name="FITNESS.md"
        )


class FuelLogger(SessionLogger):
    def __init__(self):
        super().__init__(
            project_dir="vital-hub/fuelctx",
            daily_prefix="fuel",
            dropfile_name="FUEL.md"
        )
