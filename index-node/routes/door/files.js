import fs from "fs";
import path from "path";

import {
  DOOR_PHASE_CONFIG,
  deletePhaseFile,
  getDoorPhaseConfig,
  listPhaseFiles,
  readPhaseFile,
  respondErr,
  respondOk,
  trimStr,
  writePhaseFile,
} from "./shared.js";
import {
  addHotlistEntry,
  deleteHotlistEntry,
  readHotlistEntries,
  updateHotlistEntry,
} from "./hotlist-backend.js";

const POTENTIAL_SOURCE_ID = "1-Potential";

function errorCode(err) {
  return err instanceof Error ? err.message : String(err);
}

function serializePhase(config) {
  return {
    key: config.key,
    label: config.label,
    folder: config.folder,
    primary_dir: config.primaryDir,
    sources: config.readRoots.map((root) => ({
      id: root.id,
      dir: root.dir,
    })),
  };
}

function normalizeRelativePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function buildMarkdownExcerpt(content) {
  const text = String(content || "")
    .replace(/^---[\s\S]*?---\s*/m, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 180);
}

function getPotentialConfig() {
  const config = getDoorPhaseConfig("potential");
  if (!config) throw new Error("invalid_phase");
  return config;
}

function encodePotentialKey(relativePath) {
  return `${POTENTIAL_SOURCE_ID}:${Buffer.from(normalizeRelativePath(relativePath), "utf8").toString("base64url")}`;
}

function buildPotentialFileMeta(entry, { includeContent = false } = {}) {
  const config = getPotentialConfig();
  const fullPath = path.resolve(trimStr(entry?.file));
  const rootDir = path.resolve(config.primaryDir);
  if (!fullPath || !fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) return null;
  if (fullPath !== rootDir && !fullPath.startsWith(`${rootDir}${path.sep}`)) return null;

  const relativePath = normalizeRelativePath(path.relative(rootDir, fullPath));
  if (!relativePath || relativePath.startsWith("..")) return null;

  const content = fs.readFileSync(fullPath, "utf8");
  const stat = fs.statSync(fullPath);
  return {
    key: encodePotentialKey(relativePath),
    source: config.readRoots[0]?.id || POTENTIAL_SOURCE_ID,
    name: path.basename(relativePath),
    title: trimStr(entry?.title || entry?.idea) || path.basename(relativePath, path.extname(relativePath)),
    relative_path: relativePath,
    path: fullPath,
    mtime: stat.mtime.toISOString(),
    size: stat.size,
    excerpt: buildMarkdownExcerpt(content),
    hot_index: Number.isFinite(Number(entry?.hot_index)) ? Number(entry.hot_index) : null,
    task_uuid: trimStr(entry?.task_uuid || entry?.tw_uuid),
    ...(includeContent ? { content } : {}),
  };
}

function listPotentialFiles() {
  return readHotlistEntries("active")
    .map((entry) => buildPotentialFileMeta(entry))
    .filter(Boolean)
    .sort((a, b) => (String(a.mtime) < String(b.mtime) ? 1 : -1));
}

function readPotentialFile(key) {
  const file = readPhaseFile("potential", key);
  const fullPath = path.resolve(trimStr(file.path));
  const entry = readHotlistEntries("active").find((item) => {
    const itemPath = path.resolve(trimStr(item?.file));
    return itemPath && itemPath === fullPath;
  });
  if (!entry) throw new Error("file_not_found");

  const meta = buildPotentialFileMeta(entry, { includeContent: true });
  if (!meta) throw new Error("file_not_found");
  return meta;
}

function resolvePotentialSelector(key) {
  const file = readPotentialFile(key);
  return trimStr(file.path || file.relative_path || file.name);
}

export function registerFileRoutes(router) {
  router.get("/files", (req, res) => {
    try {
      const phase = trimStr(req.query.phase).toLowerCase();
      if (!phase) {
        const phases = Object.values(DOOR_PHASE_CONFIG).map((config) => ({
          ...serializePhase(config),
          count: config.key === "potential" ? listPotentialFiles().length : listPhaseFiles(config.key).length,
        }));
        return respondOk(res, { phases }, { phases });
      }

      const config = getDoorPhaseConfig(phase);
      if (!config) return respondErr(res, 400, "invalid_phase");
      const files = phase === "potential" ? listPotentialFiles() : listPhaseFiles(phase);
      return respondOk(
        res,
        {
          phase: serializePhase(config),
          files,
        },
        {
          phase: serializePhase(config),
          files,
        }
      );
    } catch (err) {
      return respondErr(res, 500, errorCode(err));
    }
  });

  router.get("/files/read", (req, res) => {
    try {
      const phase = trimStr(req.query.phase).toLowerCase();
      const key = trimStr(req.query.key);
      if (!phase) return respondErr(res, 400, "phase_required");
      if (!key) return respondErr(res, 400, "file_key_required");

      const file = phase === "potential" ? readPotentialFile(key) : readPhaseFile(phase, key);
      return respondOk(res, { file }, { file });
    } catch (err) {
      const code = errorCode(err);
      if (code === "invalid_phase") return respondErr(res, 400, code);
      if (code === "file_key_invalid" || code === "file_source_invalid") return respondErr(res, 400, code);
      if (code === "file_not_found") return respondErr(res, 404, code);
      return respondErr(res, 500, code);
    }
  });

  router.post("/files/write", (req, res) => {
    try {
      const phase = trimStr(req.body?.phase).toLowerCase();
      if (!phase) return respondErr(res, 400, "phase_required");

      if (phase === "potential") {
        const key = trimStr(req.body?.key);
        const title = trimStr(req.body?.title);
        const content = String(req.body?.content ?? "");
        const description = buildMarkdownExcerpt(content);
        const source = trimStr(req.body?.source || "door-pwa");
        if (!title) return respondErr(res, 400, "title_required");

        const updated = key
          ? updateHotlistEntry(resolvePotentialSelector(key), { title, description, content, source })
          : updateHotlistEntry(
              trimStr(addHotlistEntry({ title, description, source }).file),
              { title, description, content, source }
            );

        const file = buildPotentialFileMeta(updated?.entry);
        if (!file) return respondErr(res, 404, "entry_file_missing:write");
        return respondOk(res, { file }, { file });
      }

      const file = writePhaseFile({
        phase,
        key: trimStr(req.body?.key),
        title: trimStr(req.body?.title),
        filename: trimStr(req.body?.filename),
        content: String(req.body?.content ?? ""),
      });

      return respondOk(res, { file }, { file });
    } catch (err) {
      const code = errorCode(err);
      if (
        code === "title_required" ||
        code === "invalid_phase" ||
        code === "file_key_invalid" ||
        code === "file_source_invalid" ||
        code === "path_required" ||
        code === "invalid_path" ||
        code === "path_outside_root"
      ) {
        return respondErr(res, 400, code);
      }
      if (code === "file_not_found" || code.startsWith("entry_not_found:") || code.startsWith("entry_file_missing:")) {
        return respondErr(res, 404, code);
      }
      return respondErr(res, 500, code);
    }
  });

  router.post("/files/delete", (req, res) => {
    try {
      const phase = trimStr(req.body?.phase).toLowerCase();
      const key = trimStr(req.body?.key);
      if (!phase) return respondErr(res, 400, "phase_required");
      if (!key) return respondErr(res, 400, "file_key_required");

      if (phase === "potential") {
        const removed = readPotentialFile(key);
        const result = deleteHotlistEntry(trimStr(removed.path || removed.relative_path || removed.name));
        return respondOk(res, { removed, entry: result?.entry || null }, { removed });
      }

      const removed = deletePhaseFile(phase, key);
      return respondOk(res, { removed }, { removed });
    } catch (err) {
      const code = errorCode(err);
      if (code === "invalid_phase") return respondErr(res, 400, code);
      if (code === "file_key_invalid" || code === "file_source_invalid") return respondErr(res, 400, code);
      if (code === "file_not_found" || code.startsWith("entry_not_found:")) return respondErr(res, 404, code);
      return respondErr(res, 500, code);
    }
  });
}
