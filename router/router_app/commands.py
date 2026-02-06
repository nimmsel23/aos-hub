from __future__ import annotations


def list_extension_commands(config: dict) -> str:
    lines: list[str] = []

    extensions = config.get("extensions", [])
    if not isinstance(extensions, list):
        extensions = []

    if "warstack_commands" in extensions:
        lines.append("/war — launch War Stack bot")
        lines.append("/warstack — alias for /war")

    if "door_flow" in extensions:
        lines.append("/war — start War Stack flow")
        lines.append("/warstack — alias for /war")
        lines.append("/door — open Door Centre link")

    if "fruits_daily" in extensions:
        lines.append("/facts — Fruits Centre info")
        lines.append("/fruits — alias for /facts")
        lines.append("/next — send the next Fruits question")
        lines.append("/skip — skip current Fruits question")
        lines.append("/web — open Fruits Centre")

    if "firemap_commands" in extensions:
        lines.append("/fire — run Fire Map (daily)")
        lines.append("/fireweek — run Fire Map (weekly)")

    core_cfg = config.get("core4_actions", {})
    tags = core_cfg.get("tags", {}) if isinstance(core_cfg, dict) else {}
    for cmd, tag in tags.items():
        lines.append(f"/{cmd} — Core4 done (+{tag})")

    return "\n".join(lines)


def configured_extension_names(config: dict) -> set[str]:
    ext_list = config.get("extensions", [])
    if not isinstance(ext_list, list):
        return set()
    return {str(name).strip() for name in ext_list if str(name).strip()}


def warstack_help_note(config: dict, ext_names: set[str] | None = None) -> str:
    if ext_names is None:
        ext_names = configured_extension_names(config)

    if "door_flow" in ext_names and "warstack_commands" in ext_names:
        return (
            "War Stack mode: door_flow + warstack_commands both enabled "
            "(choose one to avoid confusion)"
        )
    if "door_flow" in ext_names:
        return "War Stack mode: door_flow (local Index Node Door API)"
    if "warstack_commands" in ext_names:
        return "War Stack mode: warstack_commands (external bot link)"
    return ""


def extension_command_set(config: dict, ext_names: set[str] | None = None) -> set[str]:
    commands: set[str] = set()
    if ext_names is None:
        ext_names = configured_extension_names(config)
    else:
        ext_names = {str(name).strip() for name in ext_names if str(name).strip()}

    if "warstack_commands" in ext_names:
        commands.update({"war", "warstack"})

    if "door_flow" in ext_names:
        commands.update({"war", "warstack", "door"})

    if "fruits_daily" in ext_names:
        commands.update({"facts", "fruits", "next", "skip", "web", "start"})

    if "firemap_commands" in ext_names:
        commands.update({"fire", "fireweek"})

    if "core4_actions" in ext_names:
        core_cfg = config.get("core4_actions", {})
        tags = core_cfg.get("tags", {}) if isinstance(core_cfg, dict) else {}
        if isinstance(tags, dict):
            for cmd in tags.keys():
                cmd_name = str(cmd).strip().lstrip("/")
                if cmd_name:
                    commands.add(cmd_name)

    return commands
