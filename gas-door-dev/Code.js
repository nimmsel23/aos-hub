/*******************************
 * αOS Door Centre – Standalone Dev
 * WebApp entrypoint + shared include helper.
 *
 * Source: copied from `gas/` (solo HQ snapshot), split into a separate project
 * to keep the HQ home lightweight.
 *******************************/

function doGet(e) {
  const t = HtmlService.createTemplateFromFile("Door_Index");
  t.userKey = String((e && e.parameter && (e.parameter.k || e.parameter.key || e.parameter.userKey || e.parameter.user_key)) || "").trim();
  return t.evaluate()
    .setTitle("αOS Door Centre")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
