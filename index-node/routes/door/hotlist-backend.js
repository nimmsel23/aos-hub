import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOT_PY = path.resolve(__dirname, "../../../door/python-potential/hot.py");

function trimText(value) {
  return String(value == null ? "" : value).trim();
}

function runHotCommand(args) {
  if (!fs.existsSync(HOT_PY)) {
    throw new Error(`hot_backend_missing:${HOT_PY}`);
  }

  const result = spawnSync("python3", [HOT_PY, ...args], {
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const message = trimText(result.stderr) || trimText(result.stdout) || `hot_backend_failed:${result.status}`;
    throw new Error(message);
  }

  return trimText(result.stdout);
}

function parseJsonOutput(raw) {
  try {
    return JSON.parse(raw || "null");
  } catch (err) {
    throw new Error(`hot_backend_invalid_json:${err instanceof Error ? err.message : String(err)}`);
  }
}

export function readHotlistEntries(mode = "active") {
  return parseJsonOutput(runHotCommand(["json", trimText(mode) || "active"]));
}

export function addHotlistEntry({ title, description = "", source = "" }) {
  const idea = trimText(title);
  if (!idea) throw new Error("title_required");

  const args = ["add", "--json"];
  if (trimText(description)) {
    args.push("--description", trimText(description));
  }
  if (trimText(source)) {
    args.push("--source", trimText(source));
  }
  args.push(idea);
  return parseJsonOutput(runHotCommand(args));
}

export function addHotlistEntries(items) {
  const list = Array.isArray(items) ? items : [];
  return list.map((item) =>
    addHotlistEntry({
      title: trimText(item?.title || item?.idea || item),
      description: trimText(item?.description),
      source: trimText(item?.source),
    })
  );
}

export function deleteHotlistEntry(selector) {
  const ref = trimText(selector);
  if (!ref) throw new Error("selector_required");
  return parseJsonOutput(runHotCommand(["delete", "--json", ref]));
}

export function completeHotlistEntry(selector) {
  const ref = trimText(selector);
  if (!ref) throw new Error("selector_required");
  return parseJsonOutput(runHotCommand(["done", "--json", ref]));
}

export function updateHotlistEntry(selector, updates = {}) {
  const ref = trimText(selector);
  if (!ref) throw new Error("selector_required");

  const args = ["update", "--json", ref];
  if (trimText(updates.title)) args.push("--title", trimText(updates.title));
  if (trimText(updates.description)) args.push("--description", trimText(updates.description));
  if (trimText(updates.source)) args.push("--source", trimText(updates.source));

  const content = String(updates.content ?? "");
  if (content.trim()) args.push("--content", content);

  return parseJsonOutput(runHotCommand(args));
}

export function markHotlistEntry(selector, updates = {}) {
  const ref = trimText(selector);
  if (!ref) throw new Error("selector_required");

  const args = ["mark", "--json", ref];
  if (trimText(updates.status)) args.push("--status", trimText(updates.status));
  if (trimText(updates.phase)) args.push("--phase", trimText(updates.phase));
  if (trimText(updates.quadrant) || updates.quadrant === 0) args.push("--quadrant", String(updates.quadrant));
  if (trimText(updates.domino_door)) args.push("--domino-door", trimText(updates.domino_door));
  if (trimText(updates.reasoning)) args.push("--reasoning", trimText(updates.reasoning));
  if (trimText(updates.project)) args.push("--project", trimText(updates.project));
  if (Object.prototype.hasOwnProperty.call(updates, "priority")) {
    const priority = trimText(updates.priority);
    args.push("--priority", priority || "clear");
  }
  if (trimText(updates.description)) args.push("--description", trimText(updates.description));
  if (trimText(updates.annotate_file)) args.push("--annotate-file", trimText(updates.annotate_file));
  for (const tag of Array.isArray(updates.add_tags) ? updates.add_tags : []) {
    if (trimText(tag)) args.push("--add-tag", trimText(tag));
  }
  for (const tag of Array.isArray(updates.remove_tags) ? updates.remove_tags : []) {
    if (trimText(tag)) args.push("--remove-tag", trimText(tag));
  }

  return parseJsonOutput(runHotCommand(args));
}
