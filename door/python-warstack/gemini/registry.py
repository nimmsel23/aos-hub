from __future__ import annotations

from typing import Callable, Dict, Optional

from .commands import strategist

CommandFn = Callable[[object, dict], str]

_COMMANDS: Dict[str, CommandFn] = {
    "strategist": strategist.run,
}


def get_command(name: str) -> Optional[CommandFn]:
    return _COMMANDS.get(name)
