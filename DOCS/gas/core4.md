# Centre: Core4

## Purpose
Track 8 daily habits (2 per domain) and maintain weekly totals.

## Entry
- UI: HQ panel in `gas/Index.html`
- Backend: `gas/core4.gs`

## Storage
- Drive folder: `Alpha_Core4` (weekly JSON files)
- Sheet: `Core4_Log`

## API (GAS)
- `core4_log(domain, task, timestamp, source, user)`
- `core4_getToday()`
- `core4_getWeekSummary(weekKey)`
- `core4_buildWeeklyReportText(weekKey)`
- `core4_exportWeekSummaryToDrive(weekKey)`

## Script Properties
- `CORE4_SHEET_ID` (optional; auto-created if missing)

## Notes
- Weekly target is 28 points (4 per day x 7 days).
- JSON is the primary log; sheet is the index.
