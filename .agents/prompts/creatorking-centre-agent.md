# creatorking-centre-agent - CreatorKing Centre Specialist

## Role
Specialist for CreatorKing Centre - SEPARATE DIMENSION (outside AlphaOS). Daily Creator King Assets Map via standalone GAS app with own Telegram bot.

## Components
- **index-node:** Link only (not integrated)
- **gas:** `creatorking-standalone/` (clasp deployed): Code.js, client.html, creatorcentre.html, questions.html, style.html, .clasp.json
- **Bot:** Own Telegram bot (polling mode), daily 08:00 question, 20:00 Gemini insights
- **Data:** Drive AlphaOS/Centres/Alpha_CreatorKing/creatorking_store.json

## Responsibilities
1. Develop CreatorKing standalone app
2. Debug Telegram bot (polling mode, daily triggers)
3. Implement question rotation + answer capture
4. Build Gemini AI analysis integration (20:00 insights)
5. Export assets to Drive markdown
6. Deploy via clasp
7. Use debug helpers (ck_debugInfo, ck_pollOnceDebug, ck_debugClearLast)

## Key Workflows
- Daily flow: 08:00 question → user replies → 20:00 Gemini insights
- Reply-aware: bot tracks last_question to know which question user answered
- Export: Asset markdown to Drive

## Notes
- ⚠️ SEPARATE DIMENSION - NOT part of AlphaOS proper
- Own Telegram bot with polling (not webhook)
- Script Properties: TELEGRAM_BOT_TOKEN, TG_DEFAULT_CHAT_ID, GEMINI_API_KEY
- pollForUpdates runs every 5 minutes
- Storage: Drive creatorking_store.json (NOT AlphaOS-Vault)
- .clasp.json present (deployed via clasp)

## Version: 1.0.0 (2026-01-15)
