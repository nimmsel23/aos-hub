#!/usr/bin/env python3
"""Fire Map trigger extension for AlphaOS Router Bot.

Commands:
  /fire     - run firemap bot (daily)
  /fireweek - run firemap bot (weekly)

Prefers starting a user systemd unit (if present) and falls back to running the bot script.
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
        self.prefer_systemd = str(config.get("prefer_systemd", "1")).strip().lower() not in (
            "0",
            "false",
            "no",
            "off",
        )
        self.systemctl_bin = str(config.get("systemctl_bin", "systemctl")).strip() or "systemctl"
        self.systemd_no_block = str(config.get("systemd_no_block", "1")).strip().lower() not in (
            "0",
            "false",
            "no",
            "off",
        )
        self.daily_unit = str(config.get("daily_unit", "alphaos-fire-daily.service")).strip()
        self.weekly_unit = str(config.get("weekly_unit", "alphaos-fire-weekly.service")).strip()
        self.python_bin = config.get("python_bin", "python3")
        self.script = config.get("script", "python-firemap/firemap_bot.py")
        self.daily_mode = config.get("daily_mode", "daily")
        self.weekly_mode = config.get("weekly_mode", "weekly")
        self._run_lock = asyncio.Lock()

    async def setup(self) -> None:
        @self.dp.message(Command("fire"))
        async def fire_command(m: Message):
            await self._run_firemap(m, self.daily_mode)

        @self.dp.message(Command("fireweek"))
        async def fireweek_command(m: Message):
            await self._run_firemap(m, self.weekly_mode)

        logger.info("FireMapCommandsExtension: Registered /fire and /fireweek")

    def _systemd_dir(self) -> Path:
        return Path(os.environ.get("XDG_CONFIG_HOME", str(Path.home() / ".config"))) / "systemd" / "user"

    def _unit_name(self, name: str) -> str:
        name = name.strip()
        if not name:
            return ""
        return name if name.endswith(".service") else f"{name}.service"

    def _unit_file_exists(self, unit_name: str) -> bool:
        unit = self._unit_name(unit_name)
        if not unit:
            return False
        return (self._systemd_dir() / unit).is_file()

    async def _systemd_start(self, unit_name: str) -> tuple[bool, str]:
        unit = self._unit_name(unit_name)
        if not unit:
            return False, "ERR: missing systemd unit name"
        cmd = [self.systemctl_bin, "--user", "start"]
        if self.systemd_no_block:
            cmd.append("--no-block")
        cmd.append(unit)

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            out, err = await proc.communicate()
            if proc.returncode == 0:
                return True, f"OK: fire triggered via systemd ({unit})."
            err_text = (err or out or b"").decode("utf-8", errors="ignore").strip()
            if "Job is already running" in err_text or "already active" in err_text:
                return True, f"OK: fire already running ({unit})."
            return False, f"ERR: systemd start failed ({unit}). {err_text[:200]}"
        except FileNotFoundError:
            return False, f"ERR: missing command: {self.systemctl_bin}"
        except Exception as exc:
            return False, f"ERR: systemd start failed ({unit}). {exc}"

    async def _run_firemap(self, m: Message, mode: str) -> None:
        if self.prefer_systemd:
            unit = self.daily_unit if mode == self.daily_mode else self.weekly_unit
            if self._unit_file_exists(unit):
                ok, msg = await self._systemd_start(unit)
                if ok:
                    await m.answer(msg)
                    return
                logger.warning("Firemap systemd trigger failed, falling back: %s", msg)

        async with self._run_lock:
            await self._run_firemap_subprocess(m, mode)

    async def _run_firemap_subprocess(self, m: Message, mode: str) -> None:
        script_path = Path(self.script)
        if not script_path.is_absolute():
            hub_dir = os.environ.get("AOS_HUB_DIR")
            if hub_dir:
                script_path = Path(hub_dir) / script_path
            else:
                # Resolve relative to repo root (…/aos-hub), not the router CWD.
                repo_root = Path(__file__).resolve().parents[2]
                script_path = repo_root / script_path

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
