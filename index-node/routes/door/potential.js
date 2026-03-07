import {
  addHotlistEntries,
  completeHotlistEntry,
  deleteHotlistEntry,
  readHotlistEntries,
  updateHotlistEntry,
} from "./hotlist-backend.js";
import { respondErr, respondOk, trimStr } from "./shared.js";

function extractHotlistItems(body) {
  const source = trimStr(body?.source || "web");
  const rawItems = body?.items;

  if (Array.isArray(rawItems)) {
    return rawItems
      .map((item) => ({
        title: trimStr(item?.title || item?.idea || item),
        description: trimStr(item?.description),
        source: trimStr(item?.source) || source,
      }))
      .filter((item) => item.title);
  }

  const singleTitle = trimStr(body?.title || body?.idea);
  const singleDescription = trimStr(body?.description);
  if (singleTitle) {
    return [{ title: singleTitle, description: singleDescription, source }];
  }

  const text = trimStr(body?.text);
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => trimStr(line))
    .filter(Boolean)
    .map((title) => ({ title, description: "", source }));
}

function errorStatus(err) {
  const message = String(err?.message || err || "");
  if (message === "title_required" || message === "selector_required") return 400;
  if (message.startsWith("entry_not_found:") || message.startsWith("entry_file_missing:")) return 404;
  return 500;
}

export function registerPotentialRoutes(router) {
  router.get(["/hotlist", "/potential/hotlist"], (req, res) => {
    try {
      const mode = trimStr(req.query?.mode || "active");
      const items = readHotlistEntries(mode);
      return respondOk(res, { items, mode }, { items, mode });
    } catch (err) {
      return respondErr(res, errorStatus(err), String(err));
    }
  });

  router.post(["/hotlist", "/potential/hotlist"], (req, res) => {
    try {
      const items = extractHotlistItems(req.body || {});
      if (!items.length) return respondErr(res, 400, "title_required");

      const results = addHotlistEntries(items);
      const item = results[0] || null;
      return respondOk(res, { item, items: results }, { item, items: results });
    } catch (err) {
      return respondErr(res, errorStatus(err), String(err));
    }
  });

  router.delete(["/hotlist/:id", "/potential/hotlist/:id"], (req, res) => {
    try {
      const id = trimStr(req.params.id);
      if (!id) return respondErr(res, 400, "selector_required");
      const removed = deleteHotlistEntry(id);
      return respondOk(res, { removed, id }, { removed });
    } catch (err) {
      return respondErr(res, errorStatus(err), String(err));
    }
  });

  router.post(["/hotlist/:id/done", "/potential/hotlist/:id/done"], (req, res) => {
    try {
      const id = trimStr(req.params.id);
      if (!id) return respondErr(res, 400, "selector_required");
      const completed = completeHotlistEntry(id);
      return respondOk(res, { completed, id }, { completed });
    } catch (err) {
      return respondErr(res, errorStatus(err), String(err));
    }
  });

  router.put(["/hotlist/:id", "/potential/hotlist/:id"], (req, res) => {
    try {
      const id = trimStr(req.params.id);
      if (!id) return respondErr(res, 400, "selector_required");

      const item = updateHotlistEntry(id, {
        title: trimStr(req.body?.title || req.body?.idea),
        description: trimStr(req.body?.description),
        content: String(req.body?.content ?? ""),
        source: trimStr(req.body?.source),
      });
      return respondOk(res, { item, id }, { item });
    } catch (err) {
      return respondErr(res, errorStatus(err), String(err));
    }
  });
}
