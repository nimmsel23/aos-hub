#!/usr/bin/env python3
"""War Stack extension for AlphaOS Router Bot.

This extension provides a trigger command to start the War Stack creation
bot. The War Stack bot is a separate service that guides users through
creating strategic weekly war stacks (DOOR Pillar).

Commands:
  /war - Start War Stack creation bot
  /warstack - Alias for /war

Configuration in config.yaml:
  warstack_commands:
    bot_username: "@your_warstack_bot"  # Username of War Stack bot
    fallback_url: "https://t.me/your_warstack_bot"  # Direct link
    info_message: "Custom message for /war command"
"""

import logging
from aiogram.filters import Command
from aiogram.types import Message, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from .base import Extension

logger = logging.getLogger(__name__)


class WarStackExtension(Extension):
    """Extension for War Stack creation trigger."""

    def __init__(self, bot, dp, config: dict):
        """Initialize War Stack extension.

        Args:
            bot: Aiogram Bot instance
            dp: Aiogram Dispatcher instance
            config: Extension config from config.yaml['warstack_commands']
        """
        super().__init__(bot, dp, config)
        self.bot_username = config.get("bot_username", "@warstack_bot")
        self.fallback_url = config.get("fallback_url", "")
        self.info_message = config.get(
            "info_message",
            "⚔️ **War Stack Creation**\n\n"
            "War Stacks sind strategische Wochen-Pläne (DOOR Pillar).\n\n"
            "**Der Prozess:**\n"
            "1. Domain wählen (BODY/BEING/BALANCE/BUSINESS)\n"
            "2. Domino Door definieren\n"
            "3. 4 strategische Hits planen\n"
            "4. Obsidian Notiz + Taskwarrior Tasks generieren\n\n"
            "Klicke unten um zu starten:"
        )

    async def setup(self) -> None:
        """Register War Stack command handlers."""
        @self.dp.message(Command("war"))
        async def war_command(m: Message):
            """Handle /war command."""
            await self._send_war_stack_trigger(m)

        @self.dp.message(Command("warstack"))
        async def warstack_command(m: Message):
            """Handle /warstack command (alias for /war)."""
            await self._send_war_stack_trigger(m)

        logger.info("WarStackExtension: Registered /war and /warstack commands")

    async def _send_war_stack_trigger(self, m: Message) -> None:
        """Send message with War Stack bot trigger.

        Args:
            m: Telegram message
        """
        kb = InlineKeyboardBuilder()

        # Primary button: Direct link to War Stack bot
        if self.fallback_url:
            kb.button(text="🔥 Start War Stack Bot", url=self.fallback_url)
        elif self.bot_username:
            kb.button(
                text="🔥 Start War Stack Bot",
                url=f"https://t.me/{self.bot_username.lstrip('@')}"
            )

        # Secondary button: Link to War Stack documentation (if available)
        # kb.button(text="📖 War Stack Guide", url="https://...")

        kb.adjust(1)  # One button per row

        await m.answer(
            self.info_message,
            reply_markup=kb.as_markup(),
            parse_mode='Markdown'
        )

        logger.info(f"War Stack trigger sent to user {m.from_user.id}")

    def get_name(self) -> str:
        """Get extension name."""
        return "WarStack"
