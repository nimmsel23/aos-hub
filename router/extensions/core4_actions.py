#!/usr/bin/env python3
"""Core4 Taskwarrior extension for AlphaOS Router Bot.

This extension adds shortcuts for marking Core4 tasks as done via Telegram.
Commands like /fit, /fue, /med, etc. will mark the corresponding Taskwarrior
task with the matching tag as done.

Example:
  /fit → task +core4 +fitness due:today done
  /fit Felt strong today → also saves journal note via Index Node API

Configuration in config.yaml:
  core4_actions:
    api_base: http://127.0.0.1:8799
    tags:
      fit: fitness
      fue: fuel
      med: meditation
      mem: memoirs
      par: partner
      pos: posterity
      dis: discover
      dec: declare
"""

import asyncio
import json
import logging
import os
from typing import Dict

import aiohttp
from aiogram.filters import Command
from aiogram.types import Message

from .base import Extension

logger = logging.getLogger(__name__)


class Core4ActionsExtension(Extension):
    """Extension for Core4 Taskwarrior shortcuts."""

    def __init__(self, bot, dp, config: dict):
        """Initialize Core4 extension.

        Args:
            bot: Aiogram Bot instance
            dp: Aiogram Dispatcher instance
            config: Extension config from config.yaml['core4_actions']
        """
        super().__init__(bot, dp, config)
        self.tag_map: Dict[str, str] = config.get("tags", {})
        api_base = os.getenv("CORE4_API_BASE") or config.get("api_base", "http://127.0.0.1:8799")
        self.api_base = str(api_base).rstrip("/")
        self._session: aiohttp.ClientSession | None = None
        if not self.tag_map:
            logger.warning("Core4ActionsExtension: No tags configured")

    async def setup(self) -> None:
        """Register Core4 command handlers."""
        self._session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=5)
        )
        # Register handlers for each tag
        for cmd, tag in self.tag_map.items():
            self._register_core4_handler(cmd, tag)

        logger.info(f"Core4ActionsExtension: Registered {len(self.tag_map)} commands")

    async def teardown(self) -> None:
        if self._session:
            await self._session.close()

    def _register_core4_handler(self, cmd: str, tag: str) -> None:
        """Register a handler for a Core4 command.

        Args:
            cmd: Command name (e.g., "fit")
            tag: Taskwarrior tag (e.g., "fitness")
        """
        @self.dp.message(Command(cmd))
        async def core4_done(m: Message):
            """Mark Core4 task as done."""
            result = await self._mark_task_done_by_tag(tag)
            note = self._extract_note(m)
            if note:
                journal_status = await self._save_journal(tag, note)
                result = f"{result}\n{journal_status}"
            await m.answer(result)

    def _extract_note(self, m: Message) -> str:
        text = (m.text or "").strip()
        parts = text.split(maxsplit=1)
        if len(parts) < 2:
            return ""
        return parts[1].strip()

    async def _save_journal(self, tag: str, note: str) -> str:
        payload = {
            "text": note,
            "source": "telegram-core4",
            "subtask": tag,
        }
        data = await self._api_post("/api/journal", payload)
        if data and data.get("ok"):
            return "📝 Journal saved."
        return "⚠️ Journal save failed."

    async def _api_post(self, path: str, payload: dict) -> dict | None:
        if not self._session:
            return None
        url = f"{self.api_base}{path}"
        try:
            async with self._session.post(url, json=payload) as resp:
                data = await resp.json(content_type=None)
                if resp.status >= 400:
                    return {"ok": False, "error": data or f"HTTP {resp.status}"}
                return data if isinstance(data, dict) else {"ok": True}
        except Exception as exc:
            logger.error(f"Core4ActionsExtension API error: {exc}")
            return None

    async def _mark_task_done_by_tag(self, tag: str) -> str:
        """Mark a Taskwarrior task as done by tag.

        Finds the first pending task with +core4 +{tag} due:today
        and marks it as done.

        Args:
            tag: Taskwarrior tag to search for

        Returns:
            Status message (success or error)
        """
        # Export pending tasks with the tag
        export_cmd = [
            "task",
            "rc.verbose=0",
            "rc.confirmation=no",
            "+core4",
            f"+{tag}",
            "due:today",
            "status:pending",
            "export",
        ]

        try:
            proc = await asyncio.create_subprocess_exec(
                *export_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL
            )
            out, _ = await proc.communicate()
            text = (out or b"").decode("utf-8", errors="ignore").strip()

            if not text:
                return f"❌ No pending +{tag} task due today"

            # Parse JSON
            tasks = json.loads(text)
            if not tasks:
                return f"❌ No pending +{tag} task due today"

            # Get first task UUID
            task_uuid = tasks[0].get("uuid")
            if not task_uuid:
                return f"❌ Task found but no UUID"

            # Mark as done
            done_cmd = ["task", task_uuid, "done"]
            proc = await asyncio.create_subprocess_exec(
                *done_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT
            )
            out, _ = await proc.communicate()
            result = (out or b"").decode("utf-8", errors="ignore").strip()

            # Check if successful
            if proc.returncode == 0:
                task_desc = tasks[0].get("description", "task")
                return f"✅ Done: {task_desc}\n+{tag}"
            else:
                return f"❌ Failed to mark done: {result[:200]}"

        except json.JSONDecodeError:
            return f"❌ Invalid task export format"
        except Exception as exc:
            logger.error(f"Error marking task done: {exc}")
            return f"❌ Error: {exc}"

    def get_name(self) -> str:
        """Get extension name."""
        return "Core4Actions"
