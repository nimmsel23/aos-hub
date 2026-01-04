# Door War Stack (GAS HQ) – Concept & Checks

## Scope
- Parse War Stack markdown (4 Hits: Fact/Obstacle/Strike/Responsibility).
- Save markdown to `Alpha_Door/3-Production` (or legacy `War-Stacks`).
- Create Taskwarrior tasks via Bridge: 4 Hits (wait/due offsets), Door parent, Profit task; wire dependencies.
- Door task = War Stack title; project = Domino Door; tags include `+production` + domain.
- Update markdown with Taskwarrior UUIDs (frontmatter + section) as a required step.
- Optional Telegram push of the War Stack markdown (via WARSTACK_BOT_TOKEN).

## War Stack (Concept, Flow & UX)
The War Stack is not just a task payload generator; it is a guided sequence of rooms
that forces clarity and commitment before execution. The WebApp should mirror the
Python bot’s phased flow.

### Phases (Rooms)
1) **Door**  
   - Goal: define the Domino Door (title + outcome).  
   - Inputs: `Title`, `Domino Door`, `Domain`, `Subdomain`.

2) **Trigger / Narrative**  
   - Goal: why this Door, why now.  
   - Inputs: `Trigger`, `Narrative`, `Validation`, `Impact`, `Consequences`.

3) **Hits (4 Rooms)**  
   - Goal: define the 4 decisive Hits.  
   - Inputs per Hit: `Fact`, `Obstacle`, `Strike`, `Responsibility`.  
   - Rule: no empty Hit; all 4 required to proceed.

4) **Insights & Lessons**  
   - Goal: short reflection that future‑proofs execution.  
   - Inputs: `Insights`, `Lessons`.

5) **Commit & Export**  
   - Goal: finalize, generate markdown + task payloads.  
   - Actions: save to Drive, queue tasks, optional Telegram push.

### UX Rules
- Each phase is a distinct “room” (full panel step, not a giant form).
- Next step unlocked only when required fields are filled.
- Draft persists on blur/step change (no manual save needed).
- Final submit clears draft and shows a confirmation (“War Stack locked in”).

## Entry Points (current)
- HQ War Stack panel → `saveDoorEntry` with `tool = 'warstack'`.
- Direct ingestion: `door_ingestWarStack_` (markdown + sessionId) if called via WebApp.
- Task queue: tasks queued and executed via `bridge_taskExecutor_` (Bridge aiohttp).

## Parsing & Tasks
- `doorParseWarStackHits` extracts Hits from markdown.
- `door_buildWarStackTasks_` builds tasks:
  - Hits: tags `+hit +production +door +<domain>`, due today+1..4, wait +1..4.
  - Door: description = War Stack title, tags `+production +<domain>`, depends on all Hits, project = Domino Door.
  - Profit: tags `+profit +<domain>`, wait +5d, depends on Door, project = Domino Door.
- `door_updateWarStackTaskwarriorUuids_` updates markdown with UUIDs + Taskwarrior section and frontmatter (door_uuid, profit_uuid, hits).

## Storage / Drafts
- Drafts: `0-Drafts/WarStack_Draft_<session>.json` (save/load/clear) synced to Bridge at `/bridge/warstack/draft`.
- Final markdown: `3-Production/` (or legacy `War-Stacks/`).
- Task execution: if Bridge is offline, tasks are queued and flushed later; UUIDs are injected when results return.
- Background scan: `door_scanWarStacksForTasks_` can enqueue tasks for new War Stack markdowns found in `3-Production`.

## Markdown Structure (Required)
- Frontmatter: includes `taskwarrior_door_uuid`, `taskwarrior_profit_uuid`, `taskwarrior_hits[]`.
- Sections:
  - Door details (Title, Domino Door, Domain/Subdomain).
  - Trigger/Narrative/Validation/Impact/Consequences.
  - 4 Hits (Fact/Obstacle/Strike/Responsibility).
  - Insights/Lessons.
  - Taskwarrior UUID section (auto‑injected).

## Telegram
- Controlled by Script Prop `WARSTACK_TELEGRAM=1`; token from `WARSTACK_BOT_TOKEN` (fallback TELEGRAM_BOT_TOKEN/BOT_TOKEN), chat_id from `CHAT_ID`.
- Splits long markdown into chunks and sends all parts.

## Props (expected)
- Bridge URL/Auth (AOS_BRIDGE_URL/BRIDGE_URL/LAPTOP_URL + AOS_BRIDGE_TOKEN/BRIDGE_TOKEN).
- WARSTACK_BOT_TOKEN (if Tele push), WARSTACK_TELEGRAM flag.
- CHAT_ID for Tele push.

## Smoke Checks
1) War Stack Draft save/load/clear: forms → JSON in `0-Drafts`, Bridge draft endpoint accepts.
2) War Stack Export: markdown saved in `3-Production`; tasks created via Bridge; markdown updated with UUIDs; Tele push (if enabled).
3) Task dependencies: Door depends on 4 Hits; Profit depends on Door; waits/due respected.

## Open Items
- Improve due/wait configurability (per Hit).
- Auto-link War Stack to Hotlist/Door War choice (if available).
- Add explicit REST hook for War Stack ingest/export (if needed).
- Implement the multi‑room UX in the War Stack panel (match Python bot flow).
