# Current-event added-time chip — design

**Date:** 2026-07-06
**Status:** Approved (extends PR #1)

## Problem

In the rundown, past events show an over/under chip (`RundownEventChip` → `EventReport`:
`actualDuration − scheduledDuration`, orange `+` over / green `−` under, from the report).
The **currently-loaded event shows nothing** — `RundownEventChip` does `if (isLoaded) return null`.
When the operator adds/removes time on the running event, that adjustment is invisible in the
event list.

## Decision

Give the loaded event its own chip showing **only the manually added time** (`timer.addedTime`) —
hidden at zero — styled identically to the previous-event over/under chips. Chosen over a live
over/under projection (which would mirror previous events exactly) because the operator wants to
see the deliberate ± they dialed in, not natural drift. `addedTime` resets to 0 on each load /
roll auto-advance, so it never lingers onto the next event.

## Design

- **Selector** `useAddedTime` (`state.timer.addedTime`) in `common/hooks/useSocket.ts` — the chip
  re-renders only on add/remove, not every tick (matches the file's existing "extracted to avoid
  unnecessary re-renders" pattern).
- **Pure helper** `formatAddedTimeChip(addedTime): { value: string; tone: 'over' | 'under' } | null`
  in `rundown-event/rundownEvent.utils.ts`:
  - `0` → `null` (hidden)
  - `> 0` → `{ value: '+' + formatDuration(abs, abs > 2min), tone: 'over' }`
  - `< 0` → `{ value: '-' + formatDuration(abs, abs > 2min), tone: 'under' }`
  - Same `formatDuration(x, x > 2 * MILLIS_PER_MINUTE)` treatment as `EventReport` for identical
    formatting.
- **Component** `EventAddedTime` in `RundownEventChip.tsx`: reads `useAddedTime`, renders the helper
  result via `Tooltip` with `style.chip` + `style[tone]` (reusing `.over` = `$playback-over` orange,
  `.under` = green). Tooltip: `Added {mm:ss}` / `Removed {mm:ss}`. The `isLoaded` branch returns
  `<EventAddedTime className={className} />` instead of `null`.

Only the loaded event ever has non-zero `addedTime`, so no other rows are affected. Client-only;
no server, data-model, or report changes.

## Testing

- Unit: `formatAddedTimeChip` — zero → null; +5m → `+5m`/over; −5m → `-5m`/under; +90s → `+1m30s`
  (sub-2-min shows seconds).
- Live: load an event, tap +/− in Play and in Roll → chip appears/updates/clears on the running row;
  colour matches over/under; clears when the event advances.

## Non-goals

- No live over/under or natural-overrun projection on the current event (that is the offset /
  projected-end feature, already surfaced elsewhere).
- No change to past-event or future-event chips.
