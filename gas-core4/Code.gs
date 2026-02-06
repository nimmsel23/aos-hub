// ---------------------------------------------------------------------------
// gas-core4 — Core4 Telegram centre
// Polling + inline buttons for 8 daily habits.
// SoT is local (Node/JSON).  This centre only pulls + forwards user taps.
// ---------------------------------------------------------------------------

// --- config (set via Apps Script Project Settings → Script properties) -------
// TELEGRAM_BOT_TOKEN
// TELEGRAM_CHAT_ID
// BRIDGE_URL          e.g. http://100.76.x.x:8080  (Tailscale)

function cfg() {
  return PropertiesService.getScriptProperties().getProperties();
}

// ---------------------------------------------------------------------------
// Polling entry-point  →  set as Time-driven trigger (e.g. every 1 min)
// ---------------------------------------------------------------------------
function pollUpdates() {
  const props   = cfg();
  const token   = props.TELEGRAM_BOT_TOKEN;
  const offset  = Number(PropertiesService.getScriptProperties().getProperty("OFFSET") || 0);

  const resp = UrlFetchApp.fetch(
    `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=0`
  );
  const updates = JSON.parse(resp.getContentText()).result || [];

  for (const update of updates) {
    handleUpdate(update);
  }

  if (updates.length) {
    const lastId = updates[updates.length - 1].update_id + 1;
    PropertiesService.getScriptProperties().setProperty("OFFSET", String(lastId));
  }
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------
function handleUpdate(update) {
  if (update.callback_query) return handleCallback(update.callback_query);
  if (update.message && update.message.text) return handleMessage(update.message);
}

function handleMessage(msg) {
  const text = msg.text.trim();
  if (text === "/core4" || text === "/c4") {
    sendHabitGrid(msg.chat.id);
  }
}

// ---------------------------------------------------------------------------
// Inline button callback  →  habit logged
// ---------------------------------------------------------------------------
function handleCallback(cq) {
  const data  = cq.data;                   // "log:fitness"
  const habit = data.split(":")[1];
  if (!habit) return;

  const logged = logHabit(habit);          // POST → Bridge
  const chatId = cq.message.chat.id;
  const msgId  = cq.message.message_id;

  answerCallback(cq.id, logged ? `✓ ${habit}` : "⚠ offline / error");
  if (logged) sendHabitGrid(chatId, msgId);
}

// ---------------------------------------------------------------------------
// Pull today's state from Bridge
// ---------------------------------------------------------------------------
function pullToday() {
  const url = cfg().BRIDGE_URL + "/bridge/core4/today";
  try {
    const resp = UrlFetchApp.fetch(url);
    return JSON.parse(resp.getContentText()).habits || {};  // {fitness:true, …}
  } catch (_) {
    return null;                                    // laptop offline
  }
}

// ---------------------------------------------------------------------------
// POST a single habit log to Bridge
// ---------------------------------------------------------------------------
function logHabit(habit) {
  const url = cfg().BRIDGE_URL + "/bridge/core4/log";
  try {
    UrlFetchApp.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      payload: JSON.stringify({ task: habit, source: "gas-core4" }),
    });
    return true;
  } catch (_) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Telegram helpers
// ---------------------------------------------------------------------------
const HABITS = ["fitness","fuel","meditation","memoirs","partner","posterity","discover","declare"];

function sendHabitGrid(chatId, editMsgId) {
  const state  = pullToday() || {};
  const props  = cfg();
  const token  = props.TELEGRAM_BOT_TOKEN;

  // 2 buttons per row  →  4 rows
  const keyboard = [];
  for (let i = 0; i < HABITS.length; i += 2) {
    const row = HABITS.slice(i, i + 2).map(h => ({
      text: state[h] ? `✓ ${h}` : h,
      callback_data: state[h] ? "noop" : `log:${h}`,
    }));
    keyboard.push(row);
  }

  const body = {
    chat_id: chatId,
    text: "Core4 — heute",
    reply_markup: { inline_keyboard: keyboard },
  };

  const method = editMsgId ? "editMessageText" : "sendMessage";
  if (editMsgId) body.message_id = editMsgId;

  UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    payload: JSON.stringify(body),
  });
}

function answerCallback(callbackQueryId, text) {
  UrlFetchApp.fetch(`https://api.telegram.org/bot${cfg().TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    payload: JSON.stringify({ callback_query_id: callbackQueryId, text: text }),
  });
}
