from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from pathlib import Path

import yaml

logger = logging.getLogger(__name__)


def load_config(path: Path) -> dict:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    except FileNotFoundError:
        logger.warning("Config file not found: %s, using defaults", path)
        return {}
    except Exception as exc:
        logger.error("Error loading config: %s", exc)
        return {}


@dataclass(frozen=True)
class Settings:
    bot_token: str
    allowed_user_id: str
    config_path: Path
    gas_webhook_url: str
    health_url: str
    health_timeout: float | None


def read_settings() -> Settings:
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    allowed_user_id = os.getenv("ALLOWED_USER_ID", "").strip()
    config_path = Path(os.getenv("ROUTER_CONFIG", "./config.yaml")).expanduser()
    gas_webhook_url = os.getenv("AOS_GAS_WEBHOOK_URL", "").strip()
    health_url = os.getenv("BRIDGE_HEALTH_URL", "").strip()
    health_timeout_raw = os.getenv("BRIDGE_HEALTH_TIMEOUT", "").strip()

    health_timeout: float | None = None
    if health_timeout_raw:
        try:
            health_timeout = float(health_timeout_raw)
        except ValueError:
            logger.warning(
                "Invalid BRIDGE_HEALTH_TIMEOUT=%r, using config/default",
                health_timeout_raw,
            )

    return Settings(
        bot_token=bot_token,
        allowed_user_id=allowed_user_id,
        config_path=config_path,
        gas_webhook_url=gas_webhook_url,
        health_url=health_url,
        health_timeout=health_timeout,
    )
