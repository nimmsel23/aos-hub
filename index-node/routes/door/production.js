import {
  loadFlow,
  nowIso,
  respondErr,
  respondOk,
  saveFlow,
  syncHits,
  trimStr,
  weekKey,
} from "./shared.js";

export function registerProductionRoutes(router) {
  router.get(["/hits", "/production/hits"], (_req, res) => {
    try {
      const flow = loadFlow();
      const changed = syncHits(flow);
      const currentWeek = weekKey();
      const hits = (flow.warstacks || [])
        .filter((warstack) => (warstack.week || weekKey(new Date(warstack.created_at || Date.now()))) === currentWeek)
        .flatMap((warstack) => (Array.isArray(warstack.hits) ? warstack.hits : []).map((hit) => ({
          ...hit,
          warstack_id: warstack.id,
          door_title: warstack.door_title,
          week: currentWeek,
        })));

      if (changed) saveFlow(flow);
      return respondOk(res, { week: currentWeek, hits }, { hits, week: currentWeek });
    } catch (err) {
      return respondErr(res, 500, String(err));
    }
  });

  router.post(["/hits/:id/toggle", "/production/hits/:id/toggle"], (req, res) => {
    try {
      const hitId = trimStr(req.params.id);
      const flow = loadFlow();
      syncHits(flow);

      const status = flow.hits.find((entry) => trimStr(entry.id) === hitId);
      if (!status) return respondErr(res, 404, "hit_not_found");

      status.done = !Boolean(status.done);
      status.completed_at = status.done ? nowIso() : null;

      let hit = null;
      let warstackId = null;
      flow.warstacks = (flow.warstacks || []).map((ws) => {
        if (!Array.isArray(ws.hits)) return ws;
        const updatedHits = ws.hits.map((entry) => {
          if (trimStr(entry.id) !== hitId) return entry;
          const next = {
            ...entry,
            done: status.done,
            completed_at: status.completed_at,
          };
          hit = next;
          warstackId = ws.id;
          return next;
        });
        return { ...ws, hits: updatedHits };
      });

      saveFlow(flow);

      return respondOk(
        res,
        {
          hit: {
            ...status,
            ...(hit || {}),
            warstack_id: warstackId || status.warstack_id,
          },
        },
        { hit: { ...status, ...(hit || {}) } }
      );
    } catch (err) {
      return respondErr(res, 500, String(err));
    }
  });

  router.get(["/hits/week", "/production/hits/week"], (_req, res) => {
    try {
      const flow = loadFlow();
      const changed = syncHits(flow);
      const currentWeek = weekKey();
      const hits = flow.hits.filter((entry) => trimStr(entry.week) === currentWeek);
      const completed = hits.filter((entry) => entry.done).length;
      const summary = {
        week: currentWeek,
        total_hits: hits.length,
        completed_hits: completed,
        open_hits: hits.length - completed,
        completion_rate: hits.length ? Number((completed / hits.length).toFixed(4)) : 0,
      };
      if (changed) saveFlow(flow);
      return respondOk(res, { summary }, { summary });
    } catch (err) {
      return respondErr(res, 500, String(err));
    }
  });
}
