#!/usr/bin/env python3
"""Base class for router bot extensions."""

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from aiogram import Bot, Dispatcher


class Extension(ABC):
    """Base class for all router bot extensions.

    Extensions can register additional handlers, commands, or
    modify bot behavior without touching the core router logic.
    """

    def __init__(self, bot: "Bot", dp: "Dispatcher", config: dict):
        """Initialize extension with bot instance and config.

        Args:
            bot: Aiogram Bot instance
            dp: Aiogram Dispatcher instance
            config: Extension-specific config from config.yaml
        """
        self.bot = bot
        self.dp = dp
        self.config = config

    @abstractmethod
    async def setup(self) -> None:
        """Setup extension (register handlers, initialize resources).

        This method is called during bot startup.
        Raise an exception if setup fails critically.
        """
        pass

    async def teardown(self) -> None:
        """Cleanup extension resources (optional).

        Called during bot shutdown. Override if needed.
        """
        pass

    def get_name(self) -> str:
        """Get extension name (defaults to class name)."""
        return self.__class__.__name__
