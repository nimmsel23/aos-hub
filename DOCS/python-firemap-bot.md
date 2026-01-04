# Fire Map Bot

On-demand Fire Map sender from Taskwarrior.

- Code: `python-firemap-bot/firemap_bot.py`
- Env: `AOS_FIREMAP_BOT_TOKEN`, `AOS_FIREMAP_CHAT_ID`, `AOS_TELE_BIN`, `AOS_TASK_BIN`,
  `AOS_FIREMAP_DOMAINS`, `AOS_FIREMAP_PROJECT_SUFFIX`, `AOS_FIREMAP_TAGS`, `AOS_FIREMAP_DATE_FIELDS`
- Run: `python python-firemap-bot/firemap_bot.py daily|weekly|listen`

Router trigger:
- Enable `firemap_commands` in `router/config.yaml`
- `/fire` runs daily, `/fireweek` runs weekly
