#!/usr/bin/env python3
"""Door Flow extension for AlphaOS Router Bot.

Starts and handles War Stack conversations via the Index Node API.

Commands:
  /warstack [id] - start or resume a War Stack by GUID prefix
  /war - alias for /warstack
  /door - show Door Centre link (optional)
"""

import logging
import os

import aiohttp
from aiogram import F
from aiogram.filters import Command
from aiogram.types import Message

from .base import Extension

logger = logging.getLogger(__name__)


class DoorFlowExtension(Extension):
    """War Stack flow via Index Node."""

    def __init__(self, bot, dp, config: dict):
        super().__init__(bot, dp, config)
        api_base = os.getenv("DOOR_API_BASE") or config.get("api_base", "http://127.0.0.1:8799")
        self.api_base = str(api_base).rstrip("/")
        door_url = os.getenv("DOOR_WEB_URL") or config.get("web_url", "") or f"{self.api_base}/door"
        self.web_url = str(door_url).strip()
        allowed = config.get("allowed_user_ids")
        if isinstance(allowed, list):
            self.allowed_user_ids = {str(uid) for uid in allowed if str(uid).strip()}
        else:
            env_allowed = os.getenv("ALLOWED_USER_ID", "").strip()
            self.allowed_user_ids = {env_allowed} if env_allowed else set()
        self._session: aiohttp.ClientSession | None = None
        self._sessions: dict[str, str] = {}

    async def setup(self) -> None:
        self._session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=5)
        )

        @self.dp.message(Command("warstack"))
        async def warstack_command(m: Message):
            if not self._allowed(m):
                return
            await self._start_warstack(m)

        @self.dp.message(Command("war"))
        async def war_command(m: Message):
            if not self._allowed(m):
                return
            await self._start_warstack(m)

        @self.dp.message(Command("door"))
        async def door_command(m: Message):
            if not self._allowed(m):
                return
            await m.answer(
                f"🚪 Door Centre: {self.web_url}",
                disable_web_page_preview=True,
            )

        @self.dp.message(F.text & ~F.text.regexp(r"^/"))
        async def answer_message(m: Message):
            if not self._allowed(m):
                return
            await self._handle_answer(m)

        logger.info("DoorFlowExtension: handlers registered")

    async def teardown(self) -> None:
        if self._session:
            await self._session.close()

    def _allowed(self, m: Message) -> bool:
        if not self.allowed_user_ids:
            return True
        return str(m.from_user.id) in self.allowed_user_ids

    async def _start_warstack(self, m: Message) -> None:
        parts = (m.text or "").split()
        id_ref = parts[1] if len(parts) > 1 else ""
        payload = {
            "id": id_ref,
            "chat_id": str(m.chat.id),
            "user_name": m.from_user.first_name or m.from_user.username or "User",
            "source": "telegram",
        }
        if not id_ref:
            payload["title"] = "War Stack"

        data = await self._api_post("/api/door/warstack/start", payload)
        if not data or not data.get("ok"):
            await m.answer("❌ Door API not reachable.")
            return

        if data.get("done"):
            await m.answer("✅ War Stack bereits abgeschlossen.")
            return

        guid = data.get("guid")
        if guid:
            self._sessions[str(m.chat.id)] = guid

        prompt = data.get("prompt") or "Weiter."
        await m.answer(prompt)

    async def _handle_answer(self, m: Message) -> None:
        chat_id = str(m.chat.id)
        guid = self._sessions.get(chat_id)
        if not guid:
            return

        text = (m.text or "").strip()
        if text.lower() in {"stop", "cancel", "exit"}:
            self._sessions.pop(chat_id, None)
            await m.answer("🛑 War Stack abgebrochen.")
            return

        payload = {
            "id": guid,
            "chat_id": chat_id,
            "answer": text,
        }
        data = await self._api_post("/api/door/warstack/answer", payload)
        if not data or not data.get("ok"):
            await m.answer("❌ Door API not reachable.")
            return

        if data.get("done"):
            self._sessions.pop(chat_id, None)
            files = data.get("files") or {}
            msg = "✅ War Stack abgeschlossen.\n"
            if files.get("warstack"):
                msg += f"\nWar Stack: {files['warstack']}"
            if files.get("hits"):
                msg += f"\nHits: {files['hits']}"
            await m.answer(msg)
            return

        prompt = data.get("prompt") or "Weiter."
        await m.answer(prompt)

    async def _api_post(self, path: str, payload: dict) -> dict:
        if not self._session:
            return {}
        url = f"{self.api_base}{path}"
        try:
            async with self._session.post(url, json=payload) as response:
                return await response.json()
        except Exception as exc:
            logger.warning(f"Door API error: {exc}")
            return {}

    def get_name(self) -> str:
        return "DoorFlow"
