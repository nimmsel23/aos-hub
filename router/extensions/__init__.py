#!/usr/bin/env python3
"""Extension loader for router bot."""

import importlib
import logging
from typing import List, TYPE_CHECKING

from .base import Extension

if TYPE_CHECKING:
    from aiogram import Bot, Dispatcher

logger = logging.getLogger(__name__)


class ExtensionLoader:
    """Loads and manages router bot extensions."""

    def __init__(self, bot: "Bot", dp: "Dispatcher", config: dict):
        """Initialize extension loader.

        Args:
            bot: Aiogram Bot instance
            dp: Aiogram Dispatcher instance
            config: Full config dict from config.yaml
        """
        self.bot = bot
        self.dp = dp
        self.config = config
        self.extensions: List[Extension] = []

    async def load_extensions(self, extension_names: List[str]) -> None:
        """Load extensions by name.

        Args:
            extension_names: List of extension module names (e.g., ['core4_actions'])
        """
        for name in extension_names:
            try:
                await self._load_extension(name)
            except Exception as exc:
                logger.error(f"Failed to load extension '{name}': {exc}")
                # Fail-soft: continue loading other extensions

    async def _load_extension(self, name: str) -> None:
        """Load a single extension by module name.

        Args:
            name: Extension module name (e.g., 'core4_actions')
        """
        # Import the extension module
        module_path = f"extensions.{name}"
        try:
            module = importlib.import_module(module_path)
        except ImportError as exc:
            raise ImportError(f"Extension module '{module_path}' not found") from exc

        # Find the Extension class in the module
        extension_class = None
        for attr_name in dir(module):
            attr = getattr(module, attr_name)
            if (
                isinstance(attr, type) and
                issubclass(attr, Extension) and
                attr is not Extension
            ):
                extension_class = attr
                break

        if not extension_class:
            raise ValueError(f"No Extension subclass found in '{module_path}'")

        # Get extension-specific config (if any)
        ext_config = self.config.get(name, {})

        # Instantiate and setup
        extension = extension_class(self.bot, self.dp, ext_config)
        await extension.setup()

        self.extensions.append(extension)
        logger.info(f"Loaded extension: {extension.get_name()}")

    async def teardown_all(self) -> None:
        """Teardown all loaded extensions."""
        for ext in reversed(self.extensions):  # Reverse order for cleanup
            try:
                await ext.teardown()
                logger.info(f"Tore down extension: {ext.get_name()}")
            except Exception as exc:
                logger.warning(f"Error tearing down {ext.get_name()}: {exc}")
