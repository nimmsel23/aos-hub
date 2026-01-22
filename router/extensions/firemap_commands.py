#!/usr/bin/env python3
"""Fire Map trigger extension for AlphaOS Router Bot.

Commands:
  /fire     - run firemap bot (daily)
  /fireweek - run firemap bot (weekly)
"""

import asyncio
import logging
import os
from pathlib import Path

from aiogram.filters import Command
from aiogram.types import Message

from .base import Extension

logger = logging.getLogger(__name__)


class FireMapCommandsExtension(Extension):
    """Extension that triggers the local firemap bot script."""

    def __init__(self, bot, dp, config: dict):
        super().__init__(bot, dp, config)
        self.python_bin = config.get("python_bin", "python3")
        self.script = config.get("script", "python-firemap-bot/firemap_bot.py")
        self.daily_mode = config.get("daily_mode", "daily")
        self.weekly_mode = config.get("weekly_mode", "weekly")

    async def setup(self) -> None:
        @self.dp.message(Command("fire"))
        async def fire_command(m: Message):
            await self._run_firemap(m, self.daily_mode)

        @self.dp.message(Command("fireweek"))
        async def fireweek_command(m: Message):
            await self._run_firemap(m, self.weekly_mode)

        logger.info("FireMapCommandsExtension: Registered /fire and /fireweek")

    async def _run_firemap(self, m: Message, mode: str) -> None:
        script_path = Path(self.script)
        if not script_path.is_absolute():
            hub_dir = os.environ.get("AOS_HUB_DIR")
            if hub_dir:
                script_path = Path(hub_dir) / script_path
            else:
                script_path = Path.cwd() / script_path

        if not script_path.exists():
            await m.answer(f"ERR: firemap bot not found: {script_path}")
            return

        cmd = [self.python_bin, str(script_path), mode]
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            out, err = await proc.communicate()
            if proc.returncode == 0:
                await m.answer(f"OK: firemap triggered ({mode}).")
            else:
                err_text = (err or out or b"").decode("utf-8", errors="ignore").strip()
                await m.answer(f"ERR: firemap failed ({mode}). {err_text[:200]}")
        except Exception as exc:
            logger.error("Firemap run failed: %s", exc)
            await m.answer(f"ERR: firemap failed ({mode}). {exc}")

    def get_name(self) -> str:
        return "FireMapCommands"
