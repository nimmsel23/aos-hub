import {
  PROFIT_DIR,
  listMarkdownFiles,
  loadFlow,
  respondErr,
  respondOk,
  saveFlow,
  syncHits,
  trimStr,
  writeReflectionMarkdown,
} from "./shared.js";

export function registerProfitRoutes(router) {
  router.get(["/completed", "/profit/completed"], (_req, res) => {
    try {
      const flow = loadFlow();
      const changed = syncHits(flow);
      const completed = (flow.warstacks || [])
        .filter((ws) => Array.isArray(ws.hits) && ws.hits.length > 0)
        .filter((ws) => ws.hits.every((hit) => Boolean(hit.done)))
        .map((ws) => ({
          id: ws.id,
          door_title: ws.door_title,
          week: ws.week,
          created_at: ws.created_at,
          completed_at: ws.hits.reduce((latest, hit) => {
            const value = trimStr(hit.completed_at);
            return value > latest ? value : latest;
          }, ""),
          hit_count: ws.hits.length,
        }))
        .sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)));
      if (changed) saveFlow(flow);
      return respondOk(res, { completed }, { completed });
    } catch (err) {
      return respondErr(res, 500, String(err));
    }
  });

  router.post(["/reflection", "/profit/reflection"], (req, res) => {
    try {
      const hasText = trimStr(req.body?.reflection || req.body?.text || req.body?.body);
      const hasDoor = trimStr(req.body?.door_title || req.body?.title);
      if (!hasText && !hasDoor) {
        return respondErr(res, 400, "reflection_required");
      }
      const filePath = writeReflectionMarkdown(req.body || {});
      return respondOk(res, { path: filePath }, { path: filePath });
    } catch (err) {
      return respondErr(res, 500, String(err));
    }
  });

  router.get(["/reflections", "/profit/reflections"], (_req, res) => {
    try {
      const reflections = listMarkdownFiles(PROFIT_DIR);
      return respondOk(res, { reflections }, { reflections });
    } catch (err) {
      return respondErr(res, 500, String(err));
    }
  });
}
