# Fire Bot (Firemap)

On-demand Fire sender from Taskwarrior.

- Engine: `python-firemap/firemap.py` (Taskwarrior `+fire` → Markdown-formatted text messages; overdue separate; grouped per project)
- Bot: `python-firemap/firemap_bot.py` (sends text, not files)
- Env: `AOS_FIREMAP_BOT_TOKEN`, `AOS_FIREMAP_CHAT_ID`, `AOS_FIREMAP_SENDER`, `AOS_TELE_BIN`, `AOS_TASK_BIN`,
  `AOS_FIREMAP_MAX_PER_PROJECT`, `AOS_FIREMAP_MAX_OVERDUE_LINES`
- Run: `python python-firemap/firemap_bot.py daily|weekly|listen|print --scope daily|weekly`

Router trigger:
- Enable `firemap_commands` in `router/config.yaml`
- `/fire` runs daily, `/fireweek` runs weekly
