# GAS Script Properties

Dieses Dokument beschreibt die Script Properties (PropertiesService) fuer das
αOS GAS HQ. Alle Keys sind Strings in den Script Properties.

## Core (Pflicht)

- `TELEGRAM_BOT_TOKEN`: Primaerer Telegram Bot Token fuer den HQ Webhook.
- `CHAT_ID`: Default Chat ID fuer Systemmeldungen.
- `WARSTACK_TELEGRAM`: `1` aktiviert War Stack Push via Telegram.
- `WARSTACK_BOT_TOKEN`: Bot Token fuer War Stack Push (fallback: `BOT_TOKEN`).
- `AOS_BRIDGE_URL`: Bridge API Base (inkl. `/bridge`).
- `WATCHDOG_BOT_TOKEN`: Bot Token fuer Watchdog Alerts.
- `WATCHDOG_CHAT_ID`: Ziel Chat ID fuer Watchdog Alerts.
- `TICKTICK_TOKEN`: TickTick Open API Token.
- `TICKTICK_INBOX_PROJECT_ID`: Default TickTick Projekt (Fallback fuer Module).

## Webhook und URLs

- `TELEGRAM_WEBHOOK_URL`: Explizite Webhook URL fuer den primaeren Bot.
- `AOS_PUBLIC_ROOT_URL`: Public Root ohne `/bridge` (optional).
- `LAPTOP_URL`: Host Root URL (Legacy/Fallback).
- `LAPTOP_WEBHOOK_URL`: Legacy Webhook/Trigger URL fuer Router/Bridge.
- `LAPTOP_TRIGGER_URL`: Optionaler Trigger Endpunkt fuer Router.
- `AOS_BRIDGE_TOKEN`: Optionaler Bridge Auth Header Token.

## Bot Tokens (zentral)

- `ALPHAOS_BOT_TOKEN`: Legacy/Primary Bot Token (Fallback).
- `BOT_TOKEN`: Universeller Bot Token (Fallback).
- `FRUITS_BOT_TOKEN`: Fruits Bot Token.
- `CORE4_BOT_TOKEN`: Core4 Bot Token.
- `VOICE_BOT_TOKEN`: Voice Bot Token.
- `DOOR_BOT_TOKEN`: Door Bot Token.
- `GAME_BOT_TOKEN`: Game Centre Bot Token (Frame/Freedom/Focus/Fire/Tent).
- `FIRE_BOT_TOKEN`: Fire Bot Token (Polling Mode).
- `WARSTACK_BOT_USERNAME`: Username fuer War Stack Bot (Router/Help).

## Centre WebApp URLs (optional, fuer direkte Links)

- `FRUITS_WEBAPP_URL`
- `CORE4_WEBAPP_URL`
- `VOICE_WEBAPP_URL`
- `DOOR_WEBAPP_URL`
- `FRAME_WEBAPP_URL`
- `FREEDOM_WEBAPP_URL`
- `FOCUS_WEBAPP_URL`
- `FIRE_MAP_URL`
- `TENT_WEBAPP_URL`
- `GAME_URL`
- `DOOR_CENTRE_URL`, `DOOR_URL` (Legacy/Alias)

## Door (Drive/Sheet/TickTick)

- `DOOR_DRIVE_FOLDER_ID`: Drive Folder fuer Door Daten.
- `DOOR_LOG_SHEET_ID`: Log Sheet fuer Door.
- `WARSTACK_USER_ID`: Ziel-User fuer War Stack Push.
- `DOOR_TICKTICK_PROJECT_POTENTIAL`
- `DOOR_TICKTICK_PROJECT_PLAN`
- `DOOR_TICKTICK_PROJECT_PRODUCTION`
- `DOOR_TICKTICK_PROJECT_PROFIT`

## Hot List

- `HOTLIST_TICKTICK_PROJECT_ID`: TickTick Projekt fuer Hot List.

## Core4

- `CORE4_SHEET_ID`: Core4 Log Sheet.

## Fruits

- `FRUITS_SHEET_ID`: Fruits Log Sheet.
- `FRUITS_DRIVE_FOLDER_ID`: Fruits Drive Folder.
- `FRUITS_DEFAULT_CHAT_ID`: Default Chat ID fuer Fruits.
- `FRUITS_WEBHOOK_URL`: Optional eigene Webhook URL fuer Fruits.
- `FRUITS_SKIPPED_QUESTION`: Letzte uebersprungene Frage (intern).
- `FRUITS_SKIPPED_SECTION`: Letzter uebersprungener Abschnitt (intern).

## Fire

- `FIRE_DRIVE_FOLDER_ID`: Fire Drive Folder.
- `FIRE_LOG_SHEET_ID`: Fire Log Sheet.
- `FIRE_GCAL_EMBED_URL`: GCal Embed URL (UI-only).
- `FIRE_GCAL_CALENDAR_ID`: GCal Kalender ID (UI-only; not used for `/fire`).
- `FIRE_GCAL_CALENDAR_NAME`: GCal Anzeigename (UI-only; not used for `/fire`).
- `FIRE_GCAL_ICS_URL`: GCal ICS URL (legacy; not used for `/fire`).
- `FIRE_TICKTICK_ICS_URL`: TickTick ICS URL (legacy; not used for `/fire`).
- `TICKTICK_PROJECT_ID`: Default TickTick Projekt fuer Fire (fallback).

## Focus/Frame/Freedom/Tent/Voice

- `FOCUS_WEBAPP_URL`, `FRAME_WEBAPP_URL`, `FREEDOM_WEBAPP_URL`
- `FOCUS_DRIVE_FOLDER_ID`, `FOCUS_LOG_SHEET_ID` (User Properties in Focus)
- `FRAME_DRIVE_FOLDER_ID`, `FRAME_LOG_SHEET_ID` (User Properties in Frame)
- `FREEDOM_DRIVE_FOLDER_ID`, `FREEDOM_LOG_SHEET_ID` (User Properties in Freedom)
- `TENT_DRIVE_FOLDER_ID`: Drive Folder fuer Tent.
- `GEN_TENT_TELEGRAM_BOT_TOKEN`: General's Tent Bot Token.
- `GEN_TENT_CHAT_ID`: General's Tent Chat ID.
- `GEN_TENT_PUBLIC_URL`: Optionales WebApp URL Override.
- `GEN_TENT_TICKTICK_TAGS`: Tags fuer TickTick Tasks (CSV).
- `GEN_TENT_COMPLETE_ENDPOINT`: TickTick Complete Endpoint Override.
- `GEN_TENT_TIMEZONE`: Zeitzone (default Script TZ).
- `VOICE_DRIVE_FOLDER_ID`, `VOICE_LOG_SHEET_ID` (User Properties in Voice).

## Task Export (Taskwarrior Sync)

- `AOS_TASK_EXPORT_FILE_ID`: Drive Datei ID fuer task_export.json.
- `AOS_TASK_EXPORT_CACHE_ID`: Cache Datei ID fuer task_export.json.
- `AOS_TASK_EXPORT_CACHE_TS`: Timestamp des letzten Cache.

## Router/Watchdog Status (intern)

- `ROUTER_HOST`: Letzter Router Host.
- `ROUTER_STARTUP_TS`: Router Start Timestamp.
- `ROUTER_STATUS`: Router Status String.
- `WATCHDOG_LAST_BEAT_TS`: Letzter Watchdog Beat Timestamp.
- `WATCHDOG_LAST_HOST`: Letzter Host.
- `WATCHDOG_IS_DOWN`: Down Flag.
- `WATCHDOG_MAX_AGE_MIN`: Max erlaubtes Alter fuer Heartbeats.
- `BRIDGE_HEARTBEAT_TS`: Letzter Bridge Heartbeat Timestamp.
- `BRIDGE_HEARTBEAT_HOST`: Letzter Bridge Host.

## Misc / Legacy

- `TELEGRAM_CHAT_ID`: Alias fuer `CHAT_ID`.
- `TELEGRAM_SHEET_ID`: Legacy Telegram Log Sheet.
- `SHEET_ID`: Legacy Sheet Alias.
- `ALLMYLINKS_URL`, `FADARO_URL`, `WORDPRESS_URL`: Public Links.
- `REFLECTION_SHEET_ID`, `REFLECTION_DRIVE_FOLDER_ID`: Reflection Centre Daten.
- `SYNC_SHEET_ID`: Sync Spreadsheet.
