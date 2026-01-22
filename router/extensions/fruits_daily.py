#!/usr/bin/env python3
"""Fruits Daily Facts extension for AlphaOS Router Bot.

Sends one Fruits question per day and accepts answers via chat.
Data is stored in the Index Node Fruits API (Answers store).

Commands:
  /facts or /fruits - show info and web link
  /next - request next Fruits question now
  /skip - skip current question (one pending skip at a time)
  /web - open Fruits Centre
"""

import asyncio
import logging
import os
import random
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import aiohttp
from aiogram import F
from aiogram.filters import Command
from aiogram.types import Message

from .base import Extension

logger = logging.getLogger(__name__)


class FruitsDailyExtension(Extension):
    """Daily Fruits facts extension."""

    def __init__(self, bot, dp, config: dict):
        super().__init__(bot, dp, config)
        api_base = os.getenv("FRUITS_API_BASE") or config.get("api_base", "http://127.0.0.1:8799")
        self.api_base = str(api_base).rstrip("/")
        web_url = os.getenv("FRUITS_WEB_URL") or config.get("web_url", "") or f"{self.api_base}/facts"
        self.web_url = str(web_url).strip()
        self.daily_hour = int(os.getenv("FRUITS_DAILY_HOUR", config.get("daily_hour", 7)))
        self.daily_minute = int(os.getenv("FRUITS_DAILY_MINUTE", config.get("daily_minute", 0)))
        self.timezone = str(os.getenv("FRUITS_TIMEZONE", config.get("timezone", "Europe/Vienna")))
        self.default_chat_id = str(
            config.get("default_chat_id", os.getenv("FRUITS_DEFAULT_CHAT_ID", ""))
        ).strip()
        allowed = config.get("allowed_user_ids")
        if isinstance(allowed, list):
            self.allowed_user_ids = {str(uid) for uid in allowed if str(uid).strip()}
        else:
            env_allowed = os.getenv("ALLOWED_USER_ID", "").strip()
            self.allowed_user_ids = {env_allowed} if env_allowed else set()
        self._session: aiohttp.ClientSession | None = None
        self._task: asyncio.Task | None = None

    async def setup(self) -> None:
        self._session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=5)
        )
        self._task = asyncio.create_task(self._daily_loop())

        @self.dp.message(Command("facts"))
        async def facts_command(m: Message):
            if not self._allowed(m):
                return
            await self._register_user(m)
            await m.answer(
                "🍎 AlphaOS Fruits Bot\n\n"
                "Daily Fact arrives at 07:00.\n"
                f"Web Centre: {self.web_url}\n\n"
                "Commands: /web /next /skip",
                disable_web_page_preview=True,
            )

        @self.dp.message(Command("start"))
        async def start_command(m: Message):
            if not self._allowed(m):
                return
            await self._send_next_question(m)

        @self.dp.message(Command("fruits"))
        async def fruits_command(m: Message):
            if not self._allowed(m):
                return
            await facts_command(m)

        @self.dp.message(Command("web"))
        async def web_command(m: Message):
            if not self._allowed(m):
                return
            await m.answer(f"🍎 Fruits Centre: {self.web_url}", disable_web_page_preview=True)

        @self.dp.message(Command("next"))
        async def next_command(m: Message):
            if not self._allowed(m):
                return
            await self._send_next_question(m)

        @self.dp.message(Command("skip"))
        async def skip_command(m: Message):
            if not self._allowed(m):
                return
            await self._skip_question(m)

        @self.dp.message(F.text & ~F.text.regexp(r"^/"))
        async def answer_message(m: Message):
            if not self._allowed(m):
                return
            await self._handle_answer(m)

        logger.info("FruitsDailyExtension: handlers registered")

    async def teardown(self) -> None:
        if self._task:
            self._task.cancel()
        if self._session:
            await self._session.close()

    def _allowed(self, m: Message) -> bool:
        if not self.allowed_user_ids:
            return True
        return str(m.from_user.id) in self.allowed_user_ids

    async def _register_user(self, m: Message) -> None:
        await self._api_post(
            "/api/fruits/register",
            {
                "chat_id": str(m.chat.id),
                "user_name": m.from_user.first_name or m.from_user.username or "User",
            },
        )

    async def _send_next_question(self, m: Message) -> None:
        payload = await self._api_post(
            "/api/fruits/next",
            {
                "chat_id": str(m.chat.id),
                "user_name": m.from_user.first_name or m.from_user.username or "User",
            },
        )
        if not payload or not payload.get("ok"):
            await m.answer("❌ Fruits API not reachable.")
            return

        if payload.get("done"):
            today = self._today_label()
            await m.answer(
                f"✅ FRUITS MAP COMPLETE - {today}\n\n"
                f"Export in Centre: {self.web_url}",
                disable_web_page_preview=True,
            )
            return

        await self._send_question_to_chat(
            str(m.chat.id),
            payload.get("section", ""),
            payload.get("question", ""),
            payload.get("pending_skip", False),
        )

    async def _skip_question(self, m: Message) -> None:
        payload = await self._api_post(
            "/api/fruits/skip",
            {
                "chat_id": str(m.chat.id),
                "user_name": m.from_user.first_name or m.from_user.username or "User",
            },
        )
        if payload and payload.get("ok"):
            await m.answer(f"{self._rand_emoji()} Skip saved. Next comes tomorrow.")
            return
        err = payload.get("error") if isinstance(payload, dict) else None
        await m.answer(err or "Skip failed.")

    async def _handle_answer(self, m: Message) -> None:
        text = (m.text or "").strip()
        if not text:
            return
        payload = await self._api_post(
            "/api/fruits/answer",
            {
                "chat_id": str(m.chat.id),
                "user_name": m.from_user.first_name or m.from_user.username or "User",
                "answer": text,
                "source": "telegram",
            },
        )
        if payload and payload.get("ok"):
            await m.answer(
                f"{self._rand_emoji()} Fact saved. Next question arrives at 07:00.",
                disable_web_page_preview=True,
            )
            return

        err = payload.get("error") if isinstance(payload, dict) else None
        await m.answer(err or "Keine offene Frage. /next oder /web.")

    async def _daily_loop(self) -> None:
        tz = ZoneInfo(self.timezone)
        while True:
            try:
                now = datetime.now(tz)
                next_run = now.replace(
                    hour=self.daily_hour,
                    minute=self.daily_minute,
                    second=0,
                    microsecond=0,
                )
                if next_run <= now:
                    next_run += timedelta(days=1)
                await asyncio.sleep((next_run - now).total_seconds())
                await self._send_daily_questions()
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.warning(f"Fruits daily loop error: {exc}")
                await asyncio.sleep(60)

    async def _send_daily_questions(self) -> None:
        users_payload = await self._api_get("/api/fruits/users")
        users = users_payload.get("users", []) if isinstance(users_payload, dict) else []
        sent = False

        for user in users:
            chat_id = str(user.get("chat_id", "")).strip()
            status = str(user.get("status", ""))
            if not chat_id or status != "active":
                continue
            payload = await self._api_post(
                "/api/fruits/next",
                {"chat_id": chat_id, "user_name": user.get("user_name", "User")},
            )
            if not payload or not payload.get("ok"):
                continue
            if payload.get("done"):
                await self.bot.send_message(
                    chat_id,
                    f"✅ FRUITS MAP COMPLETE - {self._today_label()}\n\n"
                    f"Export in Centre: {self.web_url}",
                    disable_web_page_preview=True,
                )
                sent = True
                continue
            await self._send_question_to_chat(
                chat_id,
                payload.get("section", ""),
                payload.get("question", ""),
                payload.get("pending_skip", False),
            )
            sent = True

        if not sent and self.default_chat_id:
            payload = await self._api_post(
                "/api/fruits/next",
                {"chat_id": self.default_chat_id, "user_name": "User"},
            )
            if payload and payload.get("ok"):
                if payload.get("done"):
                    await self.bot.send_message(
                        self.default_chat_id,
                        f"✅ FRUITS MAP COMPLETE - {self._today_label()}\n\n"
                        f"Export in Centre: {self.web_url}",
                        disable_web_page_preview=True,
                    )
                else:
                    await self._send_question_to_chat(
                        self.default_chat_id,
                        payload.get("section", ""),
                        payload.get("question", ""),
                        payload.get("pending_skip", False),
                    )

    async def _send_question_to_chat(self, chat_id: str, section: str, question: str, pending_skip: bool) -> None:
        if not question:
            return
        emoji = self._rand_emoji()
        today = self._today_label()
        msg = (
            f"{emoji} *AlphaOS Fruits Daily Fact - {today}*\n\n"
            f"*{section}*\n\n"
            f"{question}\n\n"
            f"_Answer here or in the Centre:_\n"
            f"{self.web_url}"
        )
        if pending_skip:
            msg += "\n\n⚠️ You still have a skipped question to answer."
        await self.bot.send_message(chat_id, msg, parse_mode="Markdown", disable_web_page_preview=True)

    async def _api_get(self, path: str) -> dict:
        if not self._session:
            return {}
        url = self.api_base + path
        try:
            async with self._session.get(url) as response:
                if response.status != 200:
                    return {}
                return await response.json(content_type=None)
        except Exception as exc:
            logger.warning(f"Fruits API GET failed: {exc}")
            return {}

    async def _api_post(self, path: str, payload: dict) -> dict:
        if not self._session:
            return {}
        url = self.api_base + path
        try:
            async with self._session.post(url, json=payload) as response:
                if response.status != 200:
                    data = await response.json(content_type=None)
                    return data if isinstance(data, dict) else {"ok": False}
                return await response.json(content_type=None)
        except Exception as exc:
            logger.warning(f"Fruits API POST failed: {exc}")
            return {}

    def _rand_emoji(self) -> str:
        emojis = ["🍎", "🍌", "🍇", "🍉", "🍓", "🍒", "🍍", "🥝", "🍊", "🍏"]
        return random.choice(emojis)

    def _today_label(self) -> str:
        try:
            return datetime.now(ZoneInfo(self.timezone)).strftime("%d.%m.%Y")
        except Exception:
            return datetime.now().strftime("%d.%m.%Y")

    def get_name(self) -> str:
        return "FruitsDaily"
