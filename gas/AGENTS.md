# GAS HQ Session Guide

Use this when the session focus is **GAS HQ only**.

## Scope

- Work only inside `gas/`.
- Do **not** edit `bridge/`, `router/`, or `index-node/` in this session.
- After edits, **redeploy** the GAS WebApp.
- Centre docs for GAS live under `DOCS/gas/` (do not mix with node docs).

## Entry Points

- `gas/entrypoints.gs` (`doGet` + `doPost`)
- `gas/index_inline.gs` (inline renderer)
- `gas/Index.html` (HQ UI)
- `gas/Index_client.html` (HQ logic)
- `gas/door.gs` / `gas/core4.gs` / `gas/fruits.gs`

## Telegram Webhook vs Polling (GAS bots)
- Keep **exactly one** webhook entrypoint: `doPost()` must live only in `gas/entrypoints.gs`.
  - For other modules, add `*_handleX_(payload)` helpers and route from `entrypoints.gs`.
- Polling bots must **not** have a webhook set for the same token (Telegram will retry/conflict).
- Never share one Telegram bot token between GAS and Router/aiogram.

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
- `AOS_BRIDGE_URL` (preferred Bridge API base; include `/bridge`)
- `AOS_BRIDGE_TOKEN` (optional, header auth)
- `AOS_PUBLIC_ROOT_URL` (optional; host root without `/bridge`)
- `WATCHDOG_BOT_TOKEN` (watchdog alerts/debug)
- `WATCHDOG_CHAT_ID` (watchdog target)
- `TICKTICK_TOKEN`
- `TICKTICK_INBOX_PROJECT_ID`

## Done Checklist

- Update `gas/README.md` if flows change.
- Redeploy GAS WebApp.

## Setup Helpers (Script Properties)

- `setupCentreUrls_(urlMap)` sets missing centre URLs without overwriting existing props.
