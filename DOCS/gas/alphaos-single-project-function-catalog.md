# alphaos_single_project.gs function catalog

Scope
- Inventory of functions still located in `gas/alphaos_single_project.gs`.
- Includes Index client dependencies.

1) Project setup wrapper
- `setupAlphaOSSingleProject()` (only function still in `gas/alphaos_single_project.gs`)

Index client dependencies
- `gas/Index_client.html` calls:
  - `getSystemStatus_()` (`gas/hq_status.gs`) for bridge/router/heartbeat status UI.
  - `getDashboardStats_()` (`gas/hq_status.gs`) for hotlist/warstack/hit counters.
  - `getCentreUrls_()` (`gas/config.gs`) for external URL buttons/dots.

Moved out of alphaos_single_project.gs (recent split)
- Hub/scheduling + week helpers → `gas/bot_hub.gs`
- Daily review / profit → `gas/door_profit.gs`
- HQ WebApp backend → `gas/hq_webapp.gs`
- `setLaptopUrl()` → `gas/config.gs`
- Reflection system → `gas/reflection.gs`
- Router bot → `gas/watchdog.gs` (merged)
- Entry points (`doGet`, `doPost`) → `gas/entrypoints.gs`
- HQ status + stats → `gas/hq_status.gs`
- Inline map renderer → `gas/index_inline.gs`
- `getPrimaryBotToken_()` → `gas/config.gs`
