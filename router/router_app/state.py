from __future__ import annotations

from dataclasses import dataclass

from .index_cache import IndexCache


@dataclass
class AppState:
    config: dict
    cache: IndexCache
    allowed_user_id: str
    health_url: str
    health_timeout: float
    gas_webhook_url: str
    extension_loader: object | None = None

    def allowed(self, uid: int) -> bool:
        return (not self.allowed_user_id) or (str(uid) == str(self.allowed_user_id))

    def loaded_extension_names(self) -> set[str]:
        if not self.extension_loader:
            return set()
        names: set[str] = set()
        for ext in getattr(self.extension_loader, "extensions", []):
            module = ext.__class__.__module__
            if module.startswith("extensions."):
                names.add(module.split(".")[-1])
        return names
