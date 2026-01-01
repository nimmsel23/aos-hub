# GAS HQ Session Guide

Use this when the session focus is **GAS HQ only**.

## Scope

- Work only inside `gas/`.
- Do **not** edit `bridge/`, `router/`, or `index-node/` in this session.
- After edits, **redeploy** the GAS WebApp.
- Centre docs for GAS live under `DOCS/gas/` (do not mix with node docs).

## Entry Points

- `gas/alphaos_single_project.gs` (`doGet` + inline renderer)
- `gas/Index.html` (HQ UI)
- `gas/Index_client.html` (HQ logic)
- `gas/door.gs` / `gas/core4.gs` / `gas/fruits.gs`

## Current Door Flow (summary)

- Hot List → `Alpha_Door/1-Potential`
- Door War → `Alpha_Door/2-Plan`
- War Stack → `Alpha_Door/3-Production` + Telegram push + task queue
- Hit List → `Alpha_Door/3-Production`
- Profit → `Alpha_Door/4-Profit` (MD + JSON)

## Draft & Resume

- War Stack drafts auto-save to `Alpha_Door/0-Drafts`.
- Drafts are pushed to Bridge `/bridge/warstack/draft` for python `/resume`.

## Required Script Properties (core)

- `CHAT_ID`, `TELEGRAM_BOT_TOKEN`
- `WARSTACK_TELEGRAM` (set `1` to enable push)
- `WARSTACK_BOT_TOKEN`
- `AOS_BRIDGE_URL`
- `TICKTICK_TOKEN`
- `TICKTICK_INBOX_PROJECT_ID`

## Done Checklist

- Update `gas/README.md` if flows change.
- Redeploy GAS WebApp.
