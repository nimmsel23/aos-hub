#!/usr/bin/env python3
"""
AOS Hot List - Universal CLI wrapper (bash/zsh/fish compatible)

Usage:
  hot "idea"                    Add to Hot List
  hot add "idea"                Add to Hot List
  hot list                      Show active Hot List (Taskwarrior report)
  hot json [mode]               Emit Hot List index as JSON
  hot sync                      Reconcile hotlist_index.json with Taskwarrior
  hot done <selector>           Complete Hot List entry
  hot update <selector>         Update Hot List entry content/metadata
  hot delete <selector>         Mark Hot List entry deleted
  hot open N                    Open Hot List entry by Taskwarrior number

Modes:
  active | all | promoted | done | deleted
"""

import argparse
import json
import os
import re
import secrets
import subprocess
import sys
from datetime import datetime
from pathlib import Path


ALPHAOS_VAULT = Path(os.environ.get("AOS_VAULT_DIR", Path.home() / "vault"))
HOT_DIR = ALPHAOS_VAULT / "Door" / "1-Potential"
HOT_PROJECT = "Potential"
HOTLIST_FILTER_ARGS = [
    "((project:Potential or project:POTENTIAL) or (project:HotList or project:HOTLIST))",
    "(status:pending or status:waiting)",
]
ACTIVE_ENTRY_STATUSES = {"", "active", "potential", "new"}
TERMINAL_ENTRY_STATUSES = {"done", "deleted", "archived"}
KNOWN_COMMANDS = {"add", "list", "json", "sync", "open", "done", "complete", "delete", "remove", "update", "mark", "help"}


def trim_text(value) -> str:
    return str(value or "").strip()


def normalize_status(value) -> str:
    return trim_text(value).lower()


def output_json(payload, *, pretty: bool = False) -> None:
    indent = 2 if pretty else None
    print(json.dumps(payload, ensure_ascii=False, indent=indent))


def make_slug(text: str, max_length: int = 50) -> str:
    """Create URL-safe slug from text."""
    slug = text.lower()
    slug = re.sub(r"[^a-z0-9\s\-]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")
    return slug[:max_length] if slug else "hot"


def hotlist_index_path() -> Path:
    return HOT_DIR / "hotlist_index.json"


def load_hot_index() -> dict:
    json_file = hotlist_index_path()
    if json_file.exists():
        try:
            data = json.loads(json_file.read_text(encoding="utf-8"))
            if isinstance(data, list):
                return {"items": data}
            if isinstance(data, dict):
                data.setdefault("items", [])
                return data
        except Exception as err:
            print(f"⚠️  JSON parse error: {err}", file=sys.stderr)
    return {"items": []}


def save_hot_index(data: dict) -> None:
    HOT_DIR.mkdir(parents=True, exist_ok=True)
    hotlist_index_path().write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def entry_idea(entry: dict) -> str:
    return trim_text(entry.get("idea") or entry.get("title"))


def get_entry_uuid(entry: dict) -> str:
    return trim_text(entry.get("tw_uuid") or entry.get("task_uuid"))


def entry_phase(entry: dict) -> str:
    return normalize_status(entry.get("phase"))


def entry_status(entry: dict) -> str:
    return normalize_status(entry.get("status"))


def entry_is_promoted(entry: dict) -> bool:
    status = entry_status(entry)
    phase = entry_phase(entry)
    return status == "promoted" or phase in {"plan", "production", "profit"}


def entry_is_terminal(entry: dict) -> bool:
    return entry_status(entry) in TERMINAL_ENTRY_STATUSES


def set_entry_task_refs(entry: dict, task_id: str, task_uuid: str) -> bool:
    changed = False
    task_id = trim_text(task_id)
    task_uuid = trim_text(task_uuid)
    if task_uuid and trim_text(entry.get("tw_uuid")) != task_uuid:
        entry["tw_uuid"] = task_uuid
        changed = True
    if task_uuid and trim_text(entry.get("task_uuid")) != task_uuid:
        entry["task_uuid"] = task_uuid
        changed = True
    if task_id and trim_text(entry.get("task_id")) != task_id:
        entry["task_id"] = task_id
        changed = True
    return changed


def ensure_entry_defaults(entry: dict) -> bool:
    changed = False
    idea = entry_idea(entry)
    if idea and trim_text(entry.get("idea")) != idea:
        entry["idea"] = idea
        changed = True
    if idea and trim_text(entry.get("title")) != idea:
        entry["title"] = idea
        changed = True

    phase = entry_phase(entry)
    if not phase:
        entry["phase"] = "plan" if entry_is_promoted(entry) else "potential"
        changed = True

    status = entry_status(entry)
    if not status and entry_phase(entry) == "potential":
        entry["status"] = "active"
        changed = True

    file_value = trim_text(entry.get("file"))
    if file_value:
        md_name = Path(file_value).name
        if trim_text(entry.get("md_name")) != md_name:
            entry["md_name"] = md_name
            changed = True

    return changed


def resolve_entry_file(entry: dict) -> Path | None:
    candidates = []
    raw_file = trim_text(entry.get("file"))
    md_name = trim_text(entry.get("md_name"))
    if raw_file:
        candidates.append(Path(raw_file))
    if md_name:
        candidates.append(HOT_DIR / md_name)
    idea = entry_idea(entry)
    if idea:
        candidates.append(HOT_DIR / f"{make_slug(idea)}.md")

    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def task_export(uuid_or_id: str) -> dict | None:
    ref = trim_text(uuid_or_id)
    if not ref:
        return None
    result = subprocess.run(
        ["task", ref, "export"],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0 or not result.stdout.strip():
        return None
    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        return None
    return data[0] if data else None


def get_pending_hot_tasks() -> list[dict]:
    result = subprocess.run(
        ["task", *HOTLIST_FILTER_ARGS, "export"],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0 or not result.stdout.strip():
        return []
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return []


def find_pending_hot_task_by_description(description: str, tasks: list[dict]) -> dict | None:
    wanted = trim_text(description)
    for task in tasks:
        if trim_text(task.get("description")) == wanted:
            return task
    return None


def task_has_file_annotation(task: dict, file_path: Path | None) -> bool:
    if file_path is None:
        return False
    target = str(file_path)
    for annotation in task.get("annotations") or []:
        text = trim_text(annotation.get("description"))
        if target in text:
            return True
    return False


def annotate_task_file(task_uuid: str, file_path: Path | None) -> None:
    if not task_uuid or file_path is None or not file_path.exists():
        return
    subprocess.run(
        ["task", "rc.hooks=0", task_uuid, "annotate", f"file://{file_path}"],
        capture_output=True,
        text=True,
        check=False,
    )


def normalize_priority(value: str) -> str:
    text = trim_text(value).upper()
    if text in {"", "CLEAR", "NONE", "NULL", "Q4", "0"}:
        return ""
    return text if text in {"H", "M", "L"} else ""


def modify_task_metadata(
    task_uuid: str,
    *,
    project: str | None = None,
    priority: str | None = None,
    domino_door: str | None = None,
    description: str | None = None,
    add_tags: list[str] | None = None,
    remove_tags: list[str] | None = None,
    annotate_file: Path | None = None,
) -> dict | None:
    ref = trim_text(task_uuid)
    if not ref:
        return None

    args = ["task", "rc.hooks=0", ref, "modify"]
    changed = False

    project_value = trim_text(project)
    if project is not None and project_value:
        args.append(f"project:{project_value}")
        changed = True

    if priority is not None:
        priority_value = normalize_priority(priority)
        args.append(f"priority:{priority_value}" if priority_value else "priority:")
        changed = True

    domino_value = trim_text(domino_door)
    if domino_door is not None and domino_value:
        args.append(f"domino_door:{domino_value}")
        changed = True

    for tag in remove_tags or []:
        tag_value = trim_text(tag).lstrip("+-")
        if tag_value:
            args.append(f"-{tag_value}")
            changed = True

    for tag in add_tags or []:
        tag_value = trim_text(tag).lstrip("+-")
        if tag_value:
            args.append(f"+{tag_value}")
            changed = True

    description_value = trim_text(description)
    if description is not None and description_value:
        args.extend(["--", description_value])
        changed = True

    if changed:
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            return None

    if annotate_file is not None:
        annotate_task_file(ref, annotate_file)

    return task_export(ref)


def create_hot_task(idea: str, file_path: Path | None = None, priority: str = "") -> tuple[str, str]:
    args = ["task", "rc.hooks=0", "add", f"project:{HOT_PROJECT}", "+hot"]
    priority_value = normalize_priority(priority)
    if priority_value:
        args.append(f"priority:{priority_value}")
    args.extend(["--", idea])
    result = subprocess.run(
        args,
        capture_output=True,
        text=True,
        check=True,
    )
    match = re.search(r"Created task (\d+)", result.stdout)
    if not match:
        raise RuntimeError("Could not extract task ID from Taskwarrior output")

    task_id = match.group(1)
    uuid_result = subprocess.run(
        ["task", "_get", f"{task_id}.uuid"],
        capture_output=True,
        text=True,
        check=True,
    )
    task_uuid = uuid_result.stdout.strip()
    annotate_task_file(task_uuid, file_path)
    return task_id, task_uuid


def delete_hot_task(task_uuid: str) -> bool:
    ref = trim_text(task_uuid)
    if not ref:
        return False
    result = subprocess.run(
        ["task", ref, "delete"],
        input="yes\n",
        capture_output=True,
        text=True,
        check=False,
    )
    return result.returncode == 0


def complete_hot_task(task_uuid: str) -> bool:
    ref = trim_text(task_uuid)
    if not ref:
        return False
    result = subprocess.run(
        ["task", ref, "done"],
        capture_output=True,
        text=True,
        check=False,
    )
    return result.returncode == 0


def update_hot_task_description(task_uuid: str, idea: str) -> bool:
    ref = trim_text(task_uuid)
    idea = trim_text(idea)
    if not ref or not idea:
        return False

    task = task_export(ref)
    if not task or normalize_status(task.get("status")) not in {"pending", "waiting"}:
        return False
    if trim_text(task.get("description")) == idea:
        return False

    result = subprocess.run(
        ["task", "rc.hooks=0", ref, "modify", "--", idea],
        capture_output=True,
        text=True,
        check=False,
    )
    return result.returncode == 0


def split_frontmatter(content: str) -> tuple[str, str]:
    text = str(content or "")
    if not text.startswith("---\n"):
        return "", text

    marker = "\n---\n"
    end = text.find(marker, 4)
    if end == -1:
        return "", text

    frontmatter = text[4:end]
    body = text[end + len(marker):]
    return frontmatter, body


def merge_frontmatter_values(content: str, updates: dict[str, str]) -> str:
    frontmatter, body = split_frontmatter(content)
    lines = frontmatter.splitlines() if frontmatter else []

    for key, value in updates.items():
        replacement = f"{key}: {value}"
        replaced = False
        for idx, line in enumerate(lines):
            if re.match(rf"^{re.escape(key)}\s*:", line):
                lines[idx] = replacement
                replaced = True
                break
        if not replaced:
            lines.append(replacement)

    body_text = str(body or "").lstrip("\n")
    rebuilt = "---\n" + "\n".join(lines) + "\n---"
    if body_text:
        rebuilt += "\n\n" + body_text
    return rebuilt if rebuilt.endswith("\n") else rebuilt + "\n"


def strip_frontmatter(content: str) -> str:
    _, body = split_frontmatter(content)
    return body if body or content.startswith("---\n") else str(content or "")


def extract_markdown_title(content: str) -> str:
    body = strip_frontmatter(content)
    for line in body.splitlines():
        text = trim_text(line)
        if text.startswith("# "):
            return trim_text(text[2:])
    return ""


def extract_markdown_summary(content: str) -> str:
    body = strip_frontmatter(content)
    parts = []
    for line in body.splitlines():
        text = trim_text(line)
        if not text or text.startswith("#") or text in {"-", "*"}:
            continue
        parts.append(text)
    return trim_text(" ".join(parts))[:400]


def render_hot_markdown(
    idea: str,
    *,
    description: str = "",
    source: str = "",
    task_uuid: str = "",
    status: str = "active",
    phase: str = "potential",
    created: str = "",
    content: str = "",
) -> str:
    idea = trim_text(idea)
    description = trim_text(description)
    source = trim_text(source) or "cli"
    created = trim_text(created) or datetime.now().astimezone().isoformat()
    status = normalize_status(status) or "active"
    phase = normalize_status(phase) or "potential"
    task_uuid = trim_text(task_uuid) or "null"

    if trim_text(content):
        return merge_frontmatter_values(
            content,
            {
                "tw_uuid": task_uuid,
                "status": status,
                "phase": phase,
                "created": created,
                "source": source,
            },
        )

    markdown_lines = [
        "---",
        f"tw_uuid: {task_uuid}",
        f"status: {status}",
        f"phase: {phase}",
        f"created: {created}",
        f"source: {source}",
        "---",
        "",
        f"# 🔥 {idea}",
        "",
    ]
    if description:
        markdown_lines.extend(
            [
                "## Description",
                "",
                description,
                "",
            ]
        )
    return "\n".join(markdown_lines) + "\n"


def write_hot_markdown(
    file_path: Path,
    *,
    idea: str,
    description: str = "",
    source: str = "",
    task_uuid: str = "",
    status: str = "active",
    phase: str = "potential",
    created: str = "",
    content: str = "",
) -> None:
    file_path.write_text(
        render_hot_markdown(
            idea,
            description=description,
            source=source,
            task_uuid=task_uuid,
            status=status,
            phase=phase,
            created=created,
            content=content,
        ),
        encoding="utf-8",
    )


def sync_entry_from_task(entry: dict, task: dict) -> bool:
    changed = False
    changed |= set_entry_task_refs(entry, trim_text(task.get("id")), trim_text(task.get("uuid")))

    task_status = normalize_status(task.get("status"))
    task_modified = trim_text(task.get("modified"))
    task_end = trim_text(task.get("end"))
    task_project = trim_text(task.get("project"))
    task_priority = normalize_priority(task.get("priority"))
    task_tags = sorted(trim_text(tag) for tag in (task.get("tags") or []) if trim_text(tag))
    task_domino_door = trim_text(task.get("domino_door"))

    if trim_text(entry.get("task_status")) != task_status:
        entry["task_status"] = task_status
        changed = True
    if task_modified and trim_text(entry.get("task_modified")) != task_modified:
        entry["task_modified"] = task_modified
        changed = True
    if trim_text(entry.get("task_project")) != task_project:
        entry["task_project"] = task_project
        changed = True
    if trim_text(entry.get("task_priority")) != task_priority:
        entry["task_priority"] = task_priority
        changed = True
    if entry.get("task_tags") != task_tags:
        entry["task_tags"] = task_tags
        changed = True
    if task_domino_door and trim_text(entry.get("domino_door")) != task_domino_door:
        entry["domino_door"] = task_domino_door
        changed = True

    if entry_is_promoted(entry):
        return changed

    if task_status in {"pending", "waiting"}:
        if entry_status(entry) != "active":
            entry["status"] = "active"
            changed = True
        if entry_phase(entry) != "potential":
            entry["phase"] = "potential"
            changed = True
        if "completed_at" in entry and entry.get("completed_at") is not None:
            entry["completed_at"] = None
            changed = True
        if "deleted_at" in entry and entry.get("deleted_at") is not None:
            entry["deleted_at"] = None
            changed = True
    elif task_status == "completed":
        if entry_status(entry) != "done":
            entry["status"] = "done"
            changed = True
        if task_end and trim_text(entry.get("completed_at")) != task_end:
            entry["completed_at"] = task_end
            changed = True
    elif task_status == "deleted":
        if entry_status(entry) != "deleted":
            entry["status"] = "deleted"
            changed = True
        if task_end and trim_text(entry.get("deleted_at")) != task_end:
            entry["deleted_at"] = task_end
            changed = True

    return changed


def mark_entry_missing(entry: dict) -> bool:
    if trim_text(entry.get("task_status")) == "missing":
        return False
    entry["task_status"] = "missing"
    return True


def enumerate_entries(items: list[dict]) -> list[dict]:
    out = []
    for idx, entry in enumerate(items, start=1):
        enriched = dict(entry)
        enriched["_hot_index0"] = idx - 1
        enriched["hot_index"] = idx
        out.append(enriched)
    return out


def filter_entries(items: list[dict], mode: str) -> list[dict]:
    key = normalize_status(mode) or "active"
    if key in {"all", "*"}:
        return items
    if key in {"active", "open"}:
        return [
            entry for entry in items
            if entry_status(entry) in ACTIVE_ENTRY_STATUSES
        ]
    if key in {"promoted", "plan"}:
        return [entry for entry in items if entry_is_promoted(entry)]
    if key in {"done", "completed"}:
        return [entry for entry in items if entry_status(entry) == "done"]
    if key in {"deleted", "remove", "removed"}:
        return [entry for entry in items if entry_status(entry) == "deleted"]
    raise ValueError(f"unknown_mode:{mode}")


def list_hotlist_json(mode: str = "active") -> list[dict]:
    reconcile_hotlist_index(apply_changes=True)
    data = load_hot_index()
    items = data.get("items", [])
    filtered = filter_entries(items, mode)
    return enumerate_entries(filtered)


def select_hotlist_entry(data: dict, selector: str) -> tuple[int, dict] | tuple[None, None]:
    items = data.get("items", [])
    enriched_items = enumerate_entries(items)
    ref = trim_text(selector)
    if not ref:
        return None, None

    if ref.isdigit():
        wanted = int(ref)
        if 1 <= wanted <= len(items):
            return wanted - 1, enriched_items[wanted - 1]
        return None, None

    for idx, entry in enumerate(enriched_items):
        file_value = trim_text(entry.get("file"))
        md_name = trim_text(entry.get("md_name"))
        candidates = [
            trim_text(entry.get("id")),
            f"hot-{entry.get('hot_index')}" if entry.get("hot_index") else "",
            trim_text(entry.get("task_uuid")),
            trim_text(entry.get("tw_uuid")),
            entry_idea(entry),
            trim_text(entry.get("domino_door")),
            file_value,
            md_name,
        ]
        for candidate in candidates:
            if not candidate:
                continue
            if candidate == ref:
                return idx, entry
            if candidate.startswith(ref) and len(ref) >= 4:
                return idx, entry
        if file_value and file_value.endswith(f"/{ref}"):
            return idx, entry

    return None, None


def reconcile_hotlist_index(apply_changes: bool = True) -> dict:
    data = load_hot_index()
    items = data.get("items", [])
    pending_hot_tasks = get_pending_hot_tasks()
    summary = {
        "repaired": 0,
        "attached": 0,
        "created": 0,
        "status_updates": 0,
        "missing": 0,
        "pruned": 0,
        "changed": False,
    }
    changed = False

    for entry in items:
        if not isinstance(entry, dict):
            continue

        changed |= ensure_entry_defaults(entry)

        idea = entry_idea(entry)
        if not idea:
            continue

        file_path = resolve_entry_file(entry)
        task_uuid = get_entry_uuid(entry)
        task = task_export(task_uuid) if task_uuid else None

        if task:
            if file_path and not task_has_file_annotation(task, file_path):
                annotate_task_file(get_entry_uuid(task), file_path)
                summary["attached"] += 1
            if sync_entry_from_task(entry, task):
                summary["status_updates"] += 1
                changed = True
            continue

        existing = find_pending_hot_task_by_description(idea, pending_hot_tasks)
        if existing:
            if set_entry_task_refs(entry, trim_text(existing.get("id")), trim_text(existing.get("uuid"))):
                changed = True
            if file_path:
                annotate_task_file(trim_text(existing.get("uuid")), file_path)
                summary["attached"] += 1
            if sync_entry_from_task(entry, existing):
                summary["status_updates"] += 1
                changed = True
            continue

        if entry_is_terminal(entry) or entry_is_promoted(entry):
            if mark_entry_missing(entry):
                summary["missing"] += 1
                changed = True
            continue

        if task_uuid:
            if mark_entry_missing(entry):
                summary["missing"] += 1
                changed = True

        if not apply_changes:
            summary["repaired"] += 1
            continue

        task_id, new_uuid = create_hot_task(idea, file_path=file_path)
        entry["status"] = "active"
        entry["phase"] = "potential"
        set_entry_task_refs(entry, task_id, new_uuid)
        entry["task_status"] = "pending"
        entry["task_modified"] = ""
        pending_hot_tasks.append(
            {
                "id": task_id,
                "uuid": new_uuid,
                "description": idea,
                "project": HOT_PROJECT,
                "status": "pending",
            }
        )
        summary["repaired"] += 1
        summary["created"] += 1
        changed = True

    # Keep live Hot List lean: once an item is done/deleted and not promoted,
    # drop it from hotlist_index.json so all frontends share the same active set.
    compacted = []
    pruned = 0
    for entry in items:
        if not isinstance(entry, dict):
            continue
        if not entry_is_promoted(entry) and entry_status(entry) in {"done", "deleted"}:
            pruned += 1
            continue
        compacted.append(entry)
    if pruned:
        data["items"] = compacted
        summary["pruned"] = pruned
        changed = True

    if changed and apply_changes:
        save_hot_index(data)

    summary["changed"] = changed
    return summary


def add_to_hotlist(idea: str, description: str = "", source: str = "") -> dict:
    """Add idea to Hot List (MD + JSON + Taskwarrior)."""
    idea = trim_text(idea)
    description = trim_text(description)
    source = trim_text(source)
    HOT_DIR.mkdir(parents=True, exist_ok=True)

    slug = make_slug(idea)
    uuid_prefix = secrets.token_hex(2)
    filename = f"{uuid_prefix}-{slug}.md"
    file_path = HOT_DIR / filename

    now = datetime.now().astimezone()
    iso = now.isoformat()
    task_id = ""
    tw_uuid = ""
    task_error = ""

    try:
        task_id, tw_uuid = create_hot_task(idea, file_path=file_path)
    except subprocess.CalledProcessError as err:
        task_error = trim_text(err.stderr or err.stdout or str(err))
    except RuntimeError as err:
        task_error = str(err)

    write_hot_markdown(
        file_path,
        idea=idea,
        description=description,
        source=source or "cli",
        task_uuid=tw_uuid,
        status="active",
        phase="potential",
        created=iso,
    )

    data = load_hot_index()
    entry = {
        "idea": idea,
        "title": idea,
        "description": description,
        "source": source or "cli",
        "created": iso,
        "created_at": iso,
        "file": str(file_path),
        "md_name": file_path.name,
        "tw_uuid": tw_uuid,
        "task_uuid": tw_uuid,
        "task_id": task_id,
        "status": "active",
        "phase": "potential",
        "quadrant": None,
        "tags": ["hot"],
    }
    if task_error:
        entry["task_status"] = "missing"
        entry["task_error"] = task_error
    else:
        entry["task_status"] = "pending"

    data["items"].append(entry)
    save_hot_index(data)

    return {
        "ok": True,
        "idea": idea,
        "description": description,
        "source": source or "cli",
        "file": str(file_path),
        "task_id": task_id,
        "task_uuid": tw_uuid,
        "task_status": entry.get("task_status"),
        "task_error": task_error,
        "count": len(data.get("items", [])),
    }


def render_active_task_report() -> int:
    result = subprocess.run(
        ["task", "rc.defaultwidth=200", "rc.verbose=nothing", *HOTLIST_FILTER_ARGS],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.stdout.strip():
        print(result.stdout, end="")
    elif result.returncode == 1:
        print("No hot items.")
    elif result.stderr.strip():
        print(result.stderr.strip())
    return 0


def render_index_list(mode: str) -> int:
    items = list_hotlist_json(mode)
    if not items:
        print(f"No hot items in mode: {mode}")
        return 0
    for entry in items:
        print(
            f"[{entry['hot_index']}] "
            f"{entry_status(entry) or '-':<10} "
            f"{entry_phase(entry) or '-':<10} "
            f"{entry_idea(entry)}"
        )
    return 0


def show_hotlist(mode: str = "active", *, as_json: bool = False) -> int:
    reconcile_hotlist_index(apply_changes=True)
    if as_json:
        output_json(list_hotlist_json(mode), pretty=True)
        return 0
    if normalize_status(mode) in {"", "active", "open"}:
        return render_active_task_report()
    return render_index_list(mode)


def open_hot_entry(number: str) -> int:
    """Open Hot List entry by Taskwarrior number."""
    try:
        reconcile_hotlist_index(apply_changes=True)
        uuid_result = subprocess.run(
            ["task", "_get", f"{number}.uuid"],
            capture_output=True,
            text=True,
            check=True,
        )
        uuid = uuid_result.stdout.strip()
        subprocess.run(["taskopen", uuid], check=False)
        return 0
    except subprocess.CalledProcessError as err:
        print(f"❌ Taskwarrior error: {err}")
        return 1
    except Exception as err:
        print(f"❌ Error: {err}")
        return 1


def delete_hot_entry(selector: str) -> dict:
    reconcile_hotlist_index(apply_changes=True)
    data = load_hot_index()
    idx, entry = select_hotlist_entry(data, selector)
    if entry is None or idx is None:
        raise ValueError(f"entry_not_found:{selector}")

    stored = data["items"][idx]
    task_uuid = get_entry_uuid(stored)
    task = task_export(task_uuid) if task_uuid else None
    deleted_task = False

    if task and normalize_status(task.get("status")) in {"pending", "waiting"}:
        deleted_task = delete_hot_task(task_uuid)
        task = task_export(task_uuid)

    changed = False
    if task:
        changed |= sync_entry_from_task(stored, task)
    else:
        changed |= mark_entry_missing(stored)

    if entry_is_promoted(stored):
        stored["task_status"] = normalize_status((task or {}).get("status")) or "deleted"
        changed = True
    else:
        if entry_status(stored) != "deleted":
            stored["status"] = "deleted"
            changed = True
        if trim_text(stored.get("deleted_at")) == "":
            stored["deleted_at"] = datetime.now().astimezone().isoformat()
            changed = True

    if changed:
        save_hot_index(data)

    return {
        "ok": True,
        "selector": selector,
        "deleted_task": deleted_task,
        "entry": enumerate_entries([stored])[0],
    }


def complete_hot_entry(selector: str) -> dict:
    reconcile_hotlist_index(apply_changes=True)
    data = load_hot_index()
    idx, entry = select_hotlist_entry(data, selector)
    if entry is None or idx is None:
        raise ValueError(f"entry_not_found:{selector}")

    stored = data["items"][idx]
    task_uuid = get_entry_uuid(stored)
    task = task_export(task_uuid) if task_uuid else None
    completed_task = False

    if task and normalize_status(task.get("status")) in {"pending", "waiting"}:
        completed_task = complete_hot_task(task_uuid)
        task = task_export(task_uuid)

    changed = False
    if task:
        changed |= sync_entry_from_task(stored, task)
    else:
        changed |= mark_entry_missing(stored)

    if entry_is_promoted(stored):
        stored["task_status"] = normalize_status((task or {}).get("status")) or "completed"
        changed = True
    else:
        if entry_status(stored) != "done":
            stored["status"] = "done"
            changed = True
        if trim_text(stored.get("completed_at")) == "":
            stored["completed_at"] = trim_text((task or {}).get("end")) or datetime.now().astimezone().isoformat()
            changed = True

    if changed:
        save_hot_index(data)

    return {
        "ok": True,
        "selector": selector,
        "completed_task": completed_task,
        "entry": enumerate_entries([stored])[0],
    }


def update_hot_entry(
    selector: str,
    *,
    title: str = "",
    description: str = "",
    content: str = "",
    source: str = "",
) -> dict:
    data = load_hot_index()
    idx, entry = select_hotlist_entry(data, selector)
    if entry is None or idx is None:
        raise ValueError(f"entry_not_found:{selector}")

    stored = data["items"][idx]
    file_path = resolve_entry_file(stored)
    if file_path is None:
        raise ValueError(f"entry_file_missing:{selector}")

    existing_content = ""
    if file_path.exists():
        existing_content = file_path.read_text(encoding="utf-8")

    next_title = trim_text(title) or extract_markdown_title(content) or entry_idea(stored)
    next_content = content if trim_text(content) else existing_content
    next_description = trim_text(description) or extract_markdown_summary(next_content) or trim_text(stored.get("description"))
    next_source = trim_text(source) or trim_text(stored.get("source")) or "cli"
    created = trim_text(stored.get("created")) or trim_text(stored.get("created_at")) or datetime.now().astimezone().isoformat()
    task_uuid = get_entry_uuid(stored)

    changed = False
    if next_title and entry_idea(stored) != next_title:
        stored["idea"] = next_title
        stored["title"] = next_title
        changed = True

    if trim_text(stored.get("description")) != next_description:
        stored["description"] = next_description
        changed = True

    if trim_text(stored.get("source")) != next_source:
        stored["source"] = next_source
        changed = True

    if trim_text(stored.get("file")) != str(file_path):
        stored["file"] = str(file_path)
        changed = True

    if trim_text(stored.get("md_name")) != file_path.name:
        stored["md_name"] = file_path.name
        changed = True

    write_hot_markdown(
        file_path,
        idea=next_title,
        description=next_description,
        source=next_source,
        task_uuid=task_uuid,
        status=entry_status(stored) or "active",
        phase=entry_phase(stored) or "potential",
        created=created,
        content=next_content,
    )

    if update_hot_task_description(task_uuid, next_title):
        task = task_export(task_uuid)
        if task and sync_entry_from_task(stored, task):
            changed = True

    if changed:
        save_hot_index(data)

    return {
        "ok": True,
        "selector": selector,
        "entry": enumerate_entries([stored])[0],
    }


def mark_hot_entry(
    selector: str,
    *,
    status: str = "",
    phase: str = "",
    quadrant: str = "",
    domino_door: str = "",
    reasoning: str = "",
    project: str = "",
    priority: str = "",
    description: str = "",
    annotate_file: str = "",
    add_tags: list[str] | None = None,
    remove_tags: list[str] | None = None,
) -> dict:
    data = load_hot_index()
    idx, entry = select_hotlist_entry(data, selector)
    if entry is None or idx is None:
        raise ValueError(f"entry_not_found:{selector}")

    stored = data["items"][idx]
    changed = False
    now = datetime.now().astimezone().isoformat()

    status_value = normalize_status(status)
    if status_value and entry_status(stored) != status_value:
        stored["status"] = status_value
        changed = True

    phase_value = normalize_status(phase)
    if phase_value and entry_phase(stored) != phase_value:
        stored["phase"] = phase_value
        changed = True

    if trim_text(quadrant) != "":
        try:
            quadrant_value = int(quadrant)
        except ValueError as err:
            raise ValueError(f"quadrant_invalid:{quadrant}") from err
        if stored.get("quadrant") != quadrant_value:
            stored["quadrant"] = quadrant_value
            changed = True

    if trim_text(domino_door) and trim_text(stored.get("domino_door")) != trim_text(domino_door):
        stored["domino_door"] = trim_text(domino_door)
        changed = True

    if trim_text(reasoning) and trim_text(stored.get("reasoning")) != trim_text(reasoning):
        stored["reasoning"] = trim_text(reasoning)
        changed = True

    task_uuid = get_entry_uuid(stored)
    annotate_path = Path(trim_text(annotate_file)).expanduser() if trim_text(annotate_file) else None
    priority_changed = trim_text(priority) != ""
    updated_task = modify_task_metadata(
        task_uuid,
        project=project if project != "" else None,
        priority=priority if priority_changed else None,
        domino_door=domino_door if domino_door != "" else None,
        description=description if description != "" else None,
        add_tags=add_tags,
        remove_tags=remove_tags,
        annotate_file=annotate_path,
    ) if (
        task_uuid and (
            project != "" or
            priority_changed or
            domino_door != "" or
            description != "" or
            trim_text(annotate_file) != "" or
            (add_tags or []) or
            (remove_tags or [])
        )
    ) else None

    if updated_task and sync_entry_from_task(stored, updated_task):
        changed = True

    if status_value == "promoted" or phase_value in {"plan", "production", "profit"}:
        if trim_text(stored.get("promoted_at")) == "":
            stored["promoted_at"] = now
            changed = True

    if changed:
        save_hot_index(data)

    return {
        "ok": True,
        "selector": selector,
        "entry": enumerate_entries([stored])[0],
    }


def sync_hotlist() -> dict:
    return reconcile_hotlist_index(apply_changes=True)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="hot", description="AOS Hot List CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    add_p = sub.add_parser("add", help="Add a Hot List idea")
    add_p.add_argument("idea", nargs="+", help="Idea title")
    add_p.add_argument("--description", default="", help="Optional detail text")
    add_p.add_argument("--source", default="", help="Optional source label")
    add_p.add_argument("--json", action="store_true", help="Emit JSON result")

    list_p = sub.add_parser("list", help="List Hot List items")
    list_p.add_argument("mode", nargs="?", default="active", help="active|all|promoted|done|deleted")
    list_p.add_argument("--json", action="store_true", help="Emit JSON result")

    json_p = sub.add_parser("json", help="Emit Hot List entries as JSON")
    json_p.add_argument("mode", nargs="?", default="active", help="active|all|promoted|done|deleted")
    json_p.add_argument("--pretty", action="store_true", help="Pretty-print JSON")

    sync_p = sub.add_parser("sync", help="Reconcile hotlist_index.json with Taskwarrior")
    sync_p.add_argument("--json", action="store_true", help="Emit JSON result")

    open_p = sub.add_parser("open", help="Open a Hot List entry by task number")
    open_p.add_argument("number", help="Taskwarrior task number")

    done_p = sub.add_parser("done", help="Complete a Hot List entry by selector")
    done_p.add_argument("selector", help="Hot index, UUID prefix, entry id, file, or exact title")
    done_p.add_argument("--json", action="store_true", help="Emit JSON result")

    complete_p = sub.add_parser("complete", help="Alias for done")
    complete_p.add_argument("selector", help="Hot index, UUID prefix, entry id, file, or exact title")
    complete_p.add_argument("--json", action="store_true", help="Emit JSON result")

    delete_p = sub.add_parser("delete", help="Delete a Hot List entry by selector")
    delete_p.add_argument("selector", help="Hot index, UUID prefix, entry id, file, or exact title")
    delete_p.add_argument("--json", action="store_true", help="Emit JSON result")

    remove_p = sub.add_parser("remove", help="Alias for delete")
    remove_p.add_argument("selector", help="Hot index, UUID prefix, entry id, file, or exact title")
    remove_p.add_argument("--json", action="store_true", help="Emit JSON result")

    update_p = sub.add_parser("update", help="Update Hot List entry content or metadata")
    update_p.add_argument("selector", help="Hot index, UUID prefix, entry id, file, or exact title")
    update_p.add_argument("--title", default="", help="Updated title")
    update_p.add_argument("--description", default="", help="Updated description")
    update_p.add_argument("--content", default="", help="Updated markdown content")
    update_p.add_argument("--source", default="", help="Optional source label")
    update_p.add_argument("--json", action="store_true", help="Emit JSON result")

    mark_p = sub.add_parser("mark", help="Update Hot List entry metadata")
    mark_p.add_argument("selector", help="Hot index, UUID prefix, entry id, file, or exact title")
    mark_p.add_argument("--status", default="", help="Entry status")
    mark_p.add_argument("--phase", default="", help="Entry phase")
    mark_p.add_argument("--quadrant", default="", help="Quadrant number")
    mark_p.add_argument("--domino-door", default="", help="Domino Door / next Door")
    mark_p.add_argument("--reasoning", default="", help="Optional reasoning text")
    mark_p.add_argument("--project", default="", help="Taskwarrior project override")
    mark_p.add_argument("--priority", default="", help="Taskwarrior priority override (H|M|L|clear)")
    mark_p.add_argument("--description", default="", help="Taskwarrior description override")
    mark_p.add_argument("--annotate-file", default="", help="Annotate task with file path")
    mark_p.add_argument("--add-tag", action="append", default=[], help="Taskwarrior tag to add")
    mark_p.add_argument("--remove-tag", action="append", default=[], help="Taskwarrior tag to remove")
    mark_p.add_argument("--json", action="store_true", help="Emit JSON result")

    sub.add_parser("help", help="Show help")
    return parser


def handle_known_command(argv: list[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "help":
        parser.print_help()
        return 0

    if args.command == "add":
        payload = add_to_hotlist(" ".join(args.idea), description=args.description, source=args.source)
        if args.json:
            output_json(payload, pretty=True)
        else:
            if payload.get("task_uuid"):
                print(f"✅ Taskwarrior: {payload.get('task_id')} (UUID: {payload['task_uuid'][:8]}...)")
            elif payload.get("task_error"):
                print(f"⚠️  Taskwarrior add failed: {payload['task_error']}")
            print(f"✅ Markdown: {Path(payload['file']).name}")
            print(f"✅ JSON: hotlist_index.json (total: {payload['count']} items)")
        return 0

    if args.command == "list":
        return show_hotlist(args.mode, as_json=args.json)

    if args.command == "json":
        output_json(list_hotlist_json(args.mode), pretty=args.pretty)
        return 0

    if args.command == "sync":
        summary = sync_hotlist()
        if args.json:
            output_json(summary, pretty=True)
        else:
            print(
                "HotList sync: "
                f"repaired={summary['repaired']} "
                f"created={summary['created']} "
                f"attached={summary['attached']} "
                f"status_updates={summary['status_updates']} "
                f"missing={summary['missing']} "
                f"changed={'yes' if summary['changed'] else 'no'}"
            )
        return 0

    if args.command == "open":
        return open_hot_entry(args.number)

    if args.command in {"done", "complete"}:
        try:
            payload = complete_hot_entry(args.selector)
        except ValueError as err:
            print(f"❌ {err}", file=sys.stderr)
            return 1
        if args.json:
            output_json(payload, pretty=True)
        else:
            print(f"Completed Hot List entry: {entry_idea(payload['entry'])}")
            if payload.get("completed_task"):
                print(f"Task completed: {get_entry_uuid(payload['entry'])}")
        return 0

    if args.command in {"delete", "remove"}:
        try:
            payload = delete_hot_entry(args.selector)
        except ValueError as err:
            print(f"❌ {err}", file=sys.stderr)
            return 1
        if args.json:
            output_json(payload, pretty=True)
        else:
            print(f"Deleted Hot List entry: {entry_idea(payload['entry'])}")
            if payload.get("deleted_task"):
                print(f"Task deleted: {get_entry_uuid(payload['entry'])}")
        return 0

    if args.command == "update":
        try:
            payload = update_hot_entry(
                args.selector,
                title=args.title,
                description=args.description,
                content=args.content,
                source=args.source,
            )
        except ValueError as err:
            print(f"❌ {err}", file=sys.stderr)
            return 1
        if args.json:
            output_json(payload, pretty=True)
        else:
            print(f"Updated Hot List entry: {entry_idea(payload['entry'])}")
        return 0

    if args.command == "mark":
        try:
            payload = mark_hot_entry(
                args.selector,
                status=args.status,
                phase=args.phase,
                quadrant=args.quadrant,
                domino_door=args.domino_door,
                reasoning=args.reasoning,
                project=args.project,
                priority=args.priority,
                description=args.description,
                annotate_file=args.annotate_file,
                add_tags=args.add_tag,
                remove_tags=args.remove_tag,
            )
        except ValueError as err:
            print(f"❌ {err}", file=sys.stderr)
            return 1
        if args.json:
            output_json(payload, pretty=True)
        else:
            print(f"Updated Hot List entry: {entry_idea(payload['entry'])}")
        return 0

    parser.print_help()
    return 1


def main() -> int:
    argv = sys.argv[1:]
    if not argv:
        print(__doc__.strip())
        return 1

    first = argv[0]
    if first in {"-h", "--help"}:
        print(__doc__.strip())
        return 0

    if first not in KNOWN_COMMANDS:
        payload = add_to_hotlist(" ".join(argv))
        if payload.get("task_uuid"):
            print(f"✅ Taskwarrior: {payload.get('task_id')} (UUID: {payload['task_uuid'][:8]}...)")
        elif payload.get("task_error"):
            print(f"⚠️  Taskwarrior add failed: {payload['task_error']}")
        print(f"✅ Markdown: {Path(payload['file']).name}")
        print(f"✅ JSON: hotlist_index.json (total: {payload['count']} items)")
        return 0

    return handle_known_command(argv)


if __name__ == "__main__":
    sys.exit(main())
