# Roll-mode add-time + projected end — design

**Date:** 2026-07-05
**Status:** Approved, pending implementation plan

## Problem

In Roll mode, the timer control's **add-time** buttons (+/− minute) are disabled. An
operator running a clock-driven show has no way, from the timer control, to say "hold the
current event a few more minutes." Separately, ontime records a per-event **report**
(actual `startedAt`/`endedAt`) but shows nothing meaningful for the event that is *currently*
running — its `endedAt` is `null` until it ends, so there is no live sense of when the
running event will actually finish.

## Key finding (why the scope is small)

The server already supports add-time during Roll; only the **client button** is disabled.
Verified against the running app and in code:

- `getCurrent()` (`apps/server/src/services/timerUtils.ts`) includes `addedTime` in every
  branch, so add-time genuinely extends the running event's countdown.
- Roll advances when `current <= 0`; because `addedTime` feeds `current`, add-time **delays
  the auto-advance** by exactly that amount — the event is held longer.
- When an event ends, the report's `endedAt` is stamped with the real wall-clock, so a
  held-longer event **already records a later actual end**.
- The main timer view (`PlaybackTimer.tsx`) already renders a live **"Expect end"** =
  `expectedFinish % dayInMs`, in every running state including Roll, and `expectedFinish`
  already includes `addedTime`. It also already shows an "Added 5:00" indicator.
- A raw `GET /api/addtime?add=300000` while rolling pushed `expectedFinish` by exactly the
  added amount and persisted across ticks (confirmed live).

Consequence: the feature is **client-only**. No server changes, no new persistence layer,
no change to the report data model.

## Scope

Three pieces.

### 1. Enable add-time buttons in Roll

The only input gap. Enable the +/− buttons while an event is **actively running** in Roll —
i.e. not during the "waiting to roll" `Pending` phase, where the server no-ops add-time
anyway (`runtimeState.addTime` returns `false` when `timer.current === null`).

- `apps/client/src/features/control/playback/add-time/AddTime.tsx`
  `canAddTime = isPlay || isPause || (isRoll && phase !== TimerPhase.Pending)`
- `apps/client/src/features/control/playback/playbackControl.utils.ts`
  matching `disableAddTime` (the util already receives `timerPhase`).

Everything downstream (timer countdown extends, "Expect end" shifts, "Added X" indicator,
event held longer, report's real `endedAt` recorded later) already works once the buttons
fire `setPlayback.addTime`.

### 2. Report panel: live "Projected End" column

`ReportSettings` is query-only today (`useReport`, react-query), so a running event shows
`—`. Add a live projected end for the running event:

- Extend `CombinedReport` with `projectedEnd: MaybeNumber` in
  `apps/client/src/features/app-settings/panel/feature-panel/reportSettings.utils.ts`.
- In `ReportSettings.tsx`, read live runtime (`useTimer().expectedFinish` +
  `useSelectedEventId`) and populate `projectedEnd` on the row whose id === the running
  event; `null` for all other rows. Render it as a "Projected End" column and include it in
  the CSV header/rows.
- Once the event ends, `actualEnd` fills in as before (already reflects the extension) and
  `projectedEnd` returns to `null` (no longer the running event).

No server or report-data-model change: the projected end is purely a live display value
derived from runtime state that the client already receives.

### 3. Main timer: optional "Scheduled end" line (toggle, default off)

The main timer already shows the projected end always-on. Add an **opt-in** scheduled-end
line so the schedule delta is only visible when the operator wants it — the default keeps
"we're a few minutes behind" off shared screens.

- Add `showScheduledEnd: boolean` (default `false`) to the existing operator-preferences
  store `apps/client/src/common/stores/editorSettings.ts` (zustand hydrated from
  `localStorage`, matching `defaultDuration` / `linkPrevious` / `timeStrategy`). This is the
  established per-browser pattern for operator UI prefs; the add-time amount and tracking bar
  next to it use `localStorage` the same way. (Contrast: playback/roll state is ephemeral
  server runtime, broadcast to all clients — the wrong model for a view preference. Server
  view-settings exist but are for audience/output views, not operator chrome.)
- In `PlaybackTimer.tsx` / `RunningStatus`: relabel the existing "Expect end" →
  **"Projected end"** (always shown). When `showScheduledEnd` is on, also render
  **"Scheduled end"** = `eventNow.timeEnd` beside it.
- Add the toggle control on the timer/playback view.

```
showScheduledEnd = off (default):
  Projected end : 19:25:30

showScheduledEnd = on:
  Scheduled end : 19:20:30
  Projected end : 19:25:30
```

## Data flow

Buttons → existing `setPlayback.addTime` (websocket) → server `addTime` (already Roll-safe)
→ runtime broadcast updates `expectedFinish` / `addedTime` → `useTimer` re-renders the main
timer live; the report view reads the same live `expectedFinish` for the running row. The
report's persisted `endedAt` is still stamped at real stop time.

## Components touched

| Unit | Change |
|------|--------|
| `add-time/AddTime.tsx` | enable buttons in running Roll |
| `playback/playbackControl.utils.ts` | matching `disableAddTime` logic |
| `feature-panel/reportSettings.utils.ts` | `CombinedReport.projectedEnd` + CSV column |
| `feature-panel/ReportSettings.tsx` | merge live runtime into running row; render column |
| `common/stores/editorSettings.ts` | `showScheduledEnd` pref (localStorage) |
| `playback/playback-timer/PlaybackTimer.tsx` | relabel + optional scheduled line + toggle |

## Testing

- Unit (`vitest`, alongside existing tests):
  - `playbackControl.utils`: add-time **enabled** in running Roll (Play/Pause too);
    **disabled** in Pending-Roll, Stop, Armed.
  - `reportSettings.utils`: `getCombinedReport` sets `projectedEnd` for the running event
    (given a selected id + expectedFinish) and `null` otherwise; CSV includes the column.
- Manual live verification in the running app: enter Roll on a running event, tap +1 →
  timer "Projected end" shifts, "Added" indicator appears, report panel "Projected End"
  updates live; toggle scheduled-end line on/off; let the event end → report "Actual End"
  reflects the extension.

## Non-goals

- No change to how the report persists (still in-memory, session-scoped).
- No new server API, OSC, or view-settings field.
- No schedule-propagation changes beyond what add-time/offset already do.
- No audience/output-view changes.
