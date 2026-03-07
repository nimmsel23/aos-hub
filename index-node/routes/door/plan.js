import crypto from "crypto";
import { markHotlistEntry, readHotlistEntries } from "./hotlist-backend.js";
import {
  WARSTACK_STEPS,
  buildWarStackHits,
  ensureHotlistShape,
  evaluateEisenhower,
  findWarstack,
  loadFlow,
  nowIso,
  respondErr,
  respondOk,
  saveFlow,
  syncHits,
  trimStr,
  weekKey,
  writeWarStackMarkdown,
} from "./shared.js";

function listDoorwars(flow) {
  return (flow.doorwars || [])
    .map((doorwar) => ({
      id: doorwar.id,
      selected_id: doorwar.selected_id || "",
      selected_task_uuid: doorwar.selected_task_uuid || "",
      selected_title: doorwar.selected_title || "",
      quadrant: doorwar.quadrant ?? null,
      reasoning: doorwar.reasoning || "",
      created_at: doorwar.created_at || "",
      evaluated_count: Array.isArray(doorwar.evaluated) ? doorwar.evaluated.length : 0,
    }))
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
}

function listWarstackSessions(flow) {
  return Object.values(flow.warstack_sessions || {})
    .map((session) => {
      const stepIndex = Number.isInteger(session.step_index) ? session.step_index : 0;
      const step = WARSTACK_STEPS[stepIndex] || null;
      const inquiry = session.inquiry && typeof session.inquiry === "object" ? session.inquiry : {};
      return {
        id: session.id,
        session_id: session.id,
        door_title: session.door_title || "",
        step_index: stepIndex,
        step: step?.key || "",
        question: step?.question || "",
        created_at: session.created_at || "",
        updated_at: session.updated_at || session.created_at || "",
        inquiry,
        answered_steps: Object.keys(inquiry),
        answered_count: Object.keys(inquiry).length,
      };
    })
    .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
}

function listWarstacks(flow) {
  return [...(flow.warstacks || [])].sort((a, b) => {
    return String(b.created_at || "").localeCompare(String(a.created_at || ""));
  });
}

function priorityForQuadrant(quadrant) {
  switch (Number(quadrant)) {
    case 1:
      return "H";
    case 2:
      return "M";
    case 3:
      return "L";
    default:
      return "";
  }
}

function priorityRank(quadrant) {
  switch (priorityForQuadrant(quadrant)) {
    case "H":
      return 3;
    case "M":
      return 2;
    case "L":
      return 1;
    default:
      return 0;
  }
}

function hotlistSelector(item) {
  return (
    trimStr(item?.id) ||
    trimStr(item?.task_uuid) ||
    trimStr(item?.tw_uuid) ||
    trimStr(item?.hot_index)
  );
}

function findHotlistEntry(items, selector, title = "") {
  const ref = trimStr(selector);
  const doorTitle = trimStr(title);
  return (Array.isArray(items) ? items : []).find((item) => {
    const hotIndex = String(item.hot_index || "").trim();
    return (
      (ref && (
        item.id === ref ||
        item.title === ref ||
        item.task_uuid === ref ||
        hotIndex === ref
      )) ||
      (doorTitle && item.title === doorTitle)
    );
  }) || null;
}

export function registerPlanRoutes(router) {
  router.get(["/doorwars", "/plan/doorwars"], (_req, res) => {
    try {
      const flow = loadFlow();
      const doorwars = listDoorwars(flow);
      return respondOk(res, { doorwars }, { doorwars });
    } catch (err) {
      return respondErr(res, 500, String(err));
    }
  });

  router.post(["/doorwar", "/plan/doorwar"], (req, res) => {
    try {
      const flow = loadFlow();
      const hotlist = readHotlistEntries("active").map(ensureHotlistShape);
      if (!hotlist.length) {
        return respondErr(res, 400, "hotlist_empty");
      }

      const evaluated = hotlist.map((item) => ({
        ...item,
        evaluation: evaluateEisenhower(item),
      }));

      for (const item of evaluated) {
        const selector = hotlistSelector(item);
        if (!selector) continue;
        markHotlistEntry(selector, {
          status: "active",
          phase: "potential",
          quadrant: item.evaluation.quadrant,
          reasoning: item.evaluation.reasoning,
          priority: priorityForQuadrant(item.evaluation.quadrant),
          project: "Potential",
        });
      }

      const requested = trimStr(req.body?.id || req.body?.choice || req.body?.title || req.body?.door_title);
      let selected = null;
      if (requested) {
        selected = evaluated.find((item) =>
          item.id === requested ||
          item.title === requested ||
          item.task_uuid === requested ||
          String(item.hot_index || "") === requested
        ) || null;
        if (selected && priorityRank(selected.evaluation.quadrant) === 0) {
          return respondErr(res, 400, "selected_item_has_no_priority", {
            selected,
            evaluated,
          });
        }
      }
      if (!selected) {
        const sorted = [...evaluated].sort((a, b) => {
          const ap = priorityRank(a.evaluation.quadrant);
          const bp = priorityRank(b.evaluation.quadrant);
          if (bp !== ap) return bp - ap;
          const ai = a.evaluation.importance_score || 0;
          const bi = b.evaluation.importance_score || 0;
          if (bi !== ai) return bi - ai;
          const au = a.evaluation.urgency_score || 0;
          const bu = b.evaluation.urgency_score || 0;
          if (bu !== au) return bu - au;
          return (a.created_at || "").localeCompare(b.created_at || "");
        });
        selected = sorted.find((item) => priorityRank(item.evaluation.quadrant) > 0) || null;
      }
      if (!selected) return respondErr(res, 400, "no_priority_winner");

      const doorwar = {
        id: crypto.randomUUID(),
        selected_id: selected.id,
        selected_task_uuid: selected.task_uuid || "",
        selected_title: selected.title,
        quadrant: selected.evaluation.quadrant,
        priority: priorityForQuadrant(selected.evaluation.quadrant),
        reasoning: trimStr(req.body?.reasoning) || selected.evaluation.reasoning,
        created_at: nowIso(),
        evaluated: evaluated.map((item) => ({
          id: item.id,
          hot_index: item.hot_index,
          task_uuid: item.task_uuid,
          title: item.title,
          quadrant: item.evaluation.quadrant,
          priority: priorityForQuadrant(item.evaluation.quadrant),
          urgency_score: item.evaluation.urgency_score,
          importance_score: item.evaluation.importance_score,
        })),
      };

      flow.doorwars.push(doorwar);
      saveFlow(flow);

      return respondOk(
        res,
        { doorwar, evaluated, selected },
        { doorwar, evaluated, selected }
      );
    } catch (err) {
      return respondErr(res, 500, String(err));
    }
  });

  router.post(["/quadrant/:id", "/plan/quadrant/:id"], (req, res) => {
    try {
      const selector = trimStr(req.params.id);
      const quadrant = Number.parseInt(trimStr(req.body?.quadrant), 10);
      if (!selector) return respondErr(res, 400, "selector_required");
      if (!Number.isInteger(quadrant) || quadrant < 1 || quadrant > 4) {
        return respondErr(res, 400, "quadrant_invalid");
      }

      const items = readHotlistEntries("all").map(ensureHotlistShape);
      const current = findHotlistEntry(items, selector, trimStr(req.body?.title));
      if (!current) return respondErr(res, 404, "entry_not_found");

      const status = trimStr(current.status || req.body?.status).toLowerCase();
      if (status === "done" || status === "deleted") {
        return respondErr(res, 400, "item_not_assignable");
      }

      const item = markHotlistEntry(hotlistSelector(current) || selector, {
        status: status || "active",
        phase: trimStr(current.phase || req.body?.phase) || "potential",
        quadrant,
        priority: priorityForQuadrant(quadrant),
        reasoning: trimStr(req.body?.reasoning) || `Q${quadrant}`,
        domino_door: trimStr(req.body?.domino_door),
        project: quadrant <= 2 ? "Plan" : "Potential",
      });

      return respondOk(
        res,
        {
          item,
          selector,
          quadrant,
          priority: priorityForQuadrant(quadrant),
        },
        { item }
      );
    } catch (err) {
      return respondErr(res, 500, String(err));
    }
  });

  router.get(["/warstacks", "/plan/warstacks"], (_req, res) => {
    try {
      const flow = loadFlow();
      const changed = syncHits(flow);
      if (changed) saveFlow(flow);
      const warstacks = listWarstacks(flow);
      return respondOk(res, { warstacks }, { warstacks });
    } catch (err) {
      return respondErr(res, 500, String(err));
    }
  });

  router.post(["/warstack/start", "/plan/warstack/start"], (req, res) => {
    try {
      const doorTitle =
        trimStr(req.body?.door_title) ||
        trimStr(req.body?.title) ||
        trimStr(req.body?.door);
      if (!doorTitle) return respondErr(res, 400, "door_title_required");

      const flow = loadFlow();
      const hotlist = readHotlistEntries("all").map(ensureHotlistShape);
      const requestedSelector = trimStr(
        req.body?.selector ||
        req.body?.selected_id ||
        req.body?.source_selector ||
        req.body?.task_uuid ||
        req.body?.selected_task_uuid
      );
      const latestDoorwar = [...(flow.doorwars || [])].sort((a, b) =>
        String(b.created_at || "").localeCompare(String(a.created_at || ""))
      )[0] || null;
      const source = findHotlistEntry(
        hotlist,
        requestedSelector || trimStr(latestDoorwar?.selected_task_uuid || latestDoorwar?.selected_id),
        doorTitle
      );

      if (source) {
        markHotlistEntry(hotlistSelector(source), {
          status: "promoted",
          phase: "plan",
          quadrant: source.quadrant,
          reasoning: trimStr(req.body?.reasoning || latestDoorwar?.reasoning || ""),
          domino_door: doorTitle,
          priority: priorityForQuadrant(source.quadrant),
          project: "Plan",
          description: doorTitle,
          add_tags: ["door"],
          remove_tags: ["hot", "potential"],
        });
      }

      const sessionId = crypto.randomUUID();
      const session = {
        id: sessionId,
        door_title: doorTitle,
        source_selector: source ? hotlistSelector(source) : "",
        source_task_uuid: source?.task_uuid || "",
        source_quadrant: source?.quadrant ?? null,
        step_index: 0,
        inquiry: {},
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      flow.warstack_sessions[sessionId] = session;
      saveFlow(flow);

      const step = WARSTACK_STEPS[0];
      return respondOk(
        res,
        {
          session_id: sessionId,
          step: step.key,
          question: step.question,
        },
        {
          session_id: sessionId,
          step: step.key,
          question: step.question,
        }
      );
    } catch (err) {
      return respondErr(res, 500, String(err));
    }
  });

  router.post(["/warstack/answer", "/plan/warstack/answer"], (req, res) => {
    try {
      const sessionId = trimStr(req.body?.session_id || req.body?.id);
      const answer = trimStr(req.body?.answer);
      if (!sessionId) return respondErr(res, 400, "session_id_required");
      if (!answer) return respondErr(res, 400, "answer_required");

      const flow = loadFlow();
      const session = flow.warstack_sessions[sessionId];
      if (!session) return respondErr(res, 404, "session_not_found");

      const stepIndex = Number.isInteger(session.step_index) ? session.step_index : 0;
      const current = WARSTACK_STEPS[stepIndex];
      if (!current) return respondErr(res, 400, "session_invalid_state");

      const providedStep = trimStr(req.body?.step);
      if (providedStep && providedStep !== current.key) {
        return respondErr(res, 400, "step_mismatch", { expected_step: current.key });
      }

      session.inquiry = session.inquiry || {};
      session.inquiry[current.key] = answer;
      session.step_index = stepIndex + 1;
      session.updated_at = nowIso();

      const next = WARSTACK_STEPS[session.step_index];
      if (next) {
        flow.warstack_sessions[sessionId] = session;
        saveFlow(flow);
        return respondOk(
          res,
          {
            session_id: sessionId,
            step: next.key,
            question: next.question,
          },
          {
            session_id: sessionId,
            step: next.key,
            question: next.question,
          }
        );
      }

      const createdAt = nowIso();
      const warstack = {
        id: crypto.randomUUID(),
        session_id: sessionId,
        door_title: session.door_title,
        inquiry: {
          trigger: trimStr(session.inquiry.trigger),
          narrative: trimStr(session.inquiry.narrative),
          validation: trimStr(session.inquiry.validation),
          impact: trimStr(session.inquiry.impact),
        },
        hits: buildWarStackHits(session.door_title, session.inquiry),
        week: weekKey(new Date(createdAt)),
        created_at: createdAt,
      };

      const markdownPath = writeWarStackMarkdown(warstack);
      warstack.path = markdownPath;

      if (trimStr(session.source_selector)) {
        markHotlistEntry(session.source_selector, {
          status: "promoted",
          phase: "plan",
          quadrant: session.source_quadrant ?? "",
          domino_door: warstack.door_title,
          project: "Plan",
          description: warstack.door_title,
          annotate_file: markdownPath,
          add_tags: ["door"],
          remove_tags: ["hot", "potential"],
        });
      }

      flow.warstacks.push(warstack);
      delete flow.warstack_sessions[sessionId];
      const changed = syncHits(flow);
      saveFlow(flow);

      return respondOk(
        res,
        { warstack, done: true, synced_hits: changed },
        { warstack, done: true }
      );
    } catch (err) {
      return respondErr(res, 500, String(err));
    }
  });

  router.get(["/warstack/sessions", "/plan/warstack/sessions"], (_req, res) => {
    try {
      const flow = loadFlow();
      const sessions = listWarstackSessions(flow);
      return respondOk(res, { sessions }, { sessions });
    } catch (err) {
      return respondErr(res, 500, String(err));
    }
  });

  router.get(["/warstack/sessions/:id", "/plan/warstack/sessions/:id"], (req, res) => {
    try {
      const flow = loadFlow();
      const sessions = listWarstackSessions(flow);
      const session = sessions.find((entry) => entry.id === trimStr(req.params.id));
      if (!session) return respondErr(res, 404, "session_not_found");
      return respondOk(res, { session }, { session });
    } catch (err) {
      return respondErr(res, 500, String(err));
    }
  });

  router.get(["/warstack/:id", "/plan/warstack/:id"], (req, res) => {
    try {
      const flow = loadFlow();
      const warstack = findWarstack(flow, req.params.id);
      if (!warstack) return respondErr(res, 404, "not_found");
      return respondOk(res, { warstack }, { warstack });
    } catch (err) {
      return respondErr(res, 500, String(err));
    }
  });
}
