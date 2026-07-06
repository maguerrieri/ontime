# Roll-mode add-time + projected end — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the operator add/subtract time from the timer control while in Roll, surface a live "Projected end" for the running event (main timer + report panel), and add an opt-in "Scheduled end" line on the timer (default off).

**Architecture:** Client-only. The server already accepts add-time during Roll and already broadcasts `timer.expectedFinish` (which includes `addedTime`); we unblock the UI and display existing runtime values. A single pure helper `canAddTimeInState` is the source of truth for when add-time is allowed; the projected end is `timer.expectedFinish`; the scheduled-end toggle is a per-browser `localStorage` preference in the existing `editorSettings` store.

**Tech Stack:** React + TypeScript, Zustand (client stores), Vitest (tests), pnpm workspaces + turbo. UI package = `ontime-ui` (`apps/client`).

## Global Constraints

- Node ~22, pnpm 11. Before running any command in a fresh shell: `source ~/.nvm/nvm.sh && nvm use 22` (verify `node --version` → v22.x).
- Run all commands from the repo root: `/Users/mario/Developer/misc/ontime/.claude/worktrees/roll-addtime-projected-end`.
- Single test file: `pnpm --filter ontime-ui exec vitest run <path-relative-to-apps/client>`.
- Typecheck: `pnpm --filter ontime-ui typecheck` (fallback: `pnpm typecheck`).
- No server changes, no report-data-model changes, no new persistence layer.
- Times are milliseconds-since-midnight; display via existing `millisToString` / `formatTime`, taking `% dayInMs` where a value may exceed a day (as the existing "Expect end" code does).
- Commit message format: `(Claude Code + Opus 4.8) <scope>: <desc>` with footer lines:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_01FL51PrQsG1bYpupXjFTzCR`.

---

## File structure

| File | Responsibility | Task |
|------|----------------|------|
| `apps/client/src/features/control/playback/playbackControl.utils.ts` | pure `canAddTimeInState` helper + `disableAddTime` | 1 |
| `apps/client/src/features/control/playback/__tests__/playbackControl.utils.test.ts` | tests for the helper | 1 |
| `apps/client/src/features/control/playback/add-time/AddTime.tsx` | enable buttons in running Roll via helper | 2 |
| `apps/client/src/features/control/playback/PlaybackControl.tsx` | pass `timerPhase` to `AddTime` | 2 |
| `apps/client/src/common/stores/editorSettings.ts` | `showScheduledEnd` preference | 3 |
| `apps/client/src/common/stores/__tests__/editorSettings.test.ts` | test the setter/persistence | 3 |
| `apps/client/src/common/hooks/useSocket.ts` | `useSelectedEventScheduledEnd` selector | 4 |
| `apps/client/src/features/control/playback/playback-timer/PlaybackTimer.tsx` | relabel + scheduled line + toggle | 4 |
| `apps/client/src/features/app-settings/panel/feature-panel/reportSettings.utils.ts` | `projectedEnd` in `CombinedReport` + CSV | 5 |
| `apps/client/src/features/app-settings/panel/feature-panel/__tests__/reportSettings.utils.test.ts` | tests for projected end | 5 |
| `apps/client/src/features/app-settings/panel/feature-panel/ReportSettings.tsx` | wire live projected end + render column | 6 |

---

## Task 1: `canAddTimeInState` helper + `disableAddTime`

**Files:**
- Modify: `apps/client/src/features/control/playback/playbackControl.utils.ts`
- Test: `apps/client/src/features/control/playback/__tests__/playbackControl.utils.test.ts` (create)

**Interfaces:**
- Produces: `canAddTimeInState(playback: Playback, phase: TimerPhase): boolean` — `true` for Play and Pause always; `true` for Roll only when `phase !== TimerPhase.Pending`; `false` otherwise. Used by Task 2 (`AddTime.tsx`) and by `disableAddTime` here.

- [ ] **Step 1: Write the failing test**

Create `apps/client/src/features/control/playback/__tests__/playbackControl.utils.test.ts`:

```ts
import { Playback, TimerPhase } from 'ontime-types';

import { canAddTimeInState, getPlaybackControlState } from '../playbackControl.utils';

describe('canAddTimeInState()', () => {
  test('allows add-time when playing or paused', () => {
    expect(canAddTimeInState(Playback.Play, TimerPhase.Default)).toBe(true);
    expect(canAddTimeInState(Playback.Pause, TimerPhase.Default)).toBe(true);
  });

  test('allows add-time in Roll while an event is actively running', () => {
    expect(canAddTimeInState(Playback.Roll, TimerPhase.Default)).toBe(true);
    expect(canAddTimeInState(Playback.Roll, TimerPhase.Overtime)).toBe(true);
    expect(canAddTimeInState(Playback.Roll, TimerPhase.Warning)).toBe(true);
  });

  test('blocks add-time while waiting to roll (Pending)', () => {
    expect(canAddTimeInState(Playback.Roll, TimerPhase.Pending)).toBe(false);
  });

  test('blocks add-time when stopped or armed', () => {
    expect(canAddTimeInState(Playback.Stop, TimerPhase.None)).toBe(false);
    expect(canAddTimeInState(Playback.Armed, TimerPhase.Default)).toBe(false);
  });
});

describe('getPlaybackControlState() disableAddTime', () => {
  const base = { numEvents: 3, selectedEventIndex: 1 };

  test('enabled in running Roll, disabled while pending', () => {
    expect(
      getPlaybackControlState({ ...base, playback: Playback.Roll, timerPhase: TimerPhase.Default }).disableAddTime,
    ).toBe(false);
    expect(
      getPlaybackControlState({ ...base, playback: Playback.Roll, timerPhase: TimerPhase.Pending }).disableAddTime,
    ).toBe(true);
  });

  test('disabled when stopped', () => {
    expect(
      getPlaybackControlState({ ...base, playback: Playback.Stop, timerPhase: TimerPhase.None }).disableAddTime,
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter ontime-ui exec vitest run src/features/control/playback/__tests__/playbackControl.utils.test.ts`
Expected: FAIL — `canAddTimeInState` is not exported.

- [ ] **Step 3: Add the helper and use it in `disableAddTime`**

In `apps/client/src/features/control/playback/playbackControl.utils.ts`, add the exported helper directly after the imports (below the `import { setPlayback } ...` line):

```ts
/**
 * Single source of truth for when the add/remove-time buttons are usable.
 * Play/Pause always; Roll only while an event is actively running (not the
 * "waiting to roll" Pending phase, where the server no-ops add-time).
 */
export function canAddTimeInState(playback: Playback, phase: TimerPhase): boolean {
  if (playback === Playback.Play || playback === Playback.Pause) return true;
  if (playback === Playback.Roll) return phase !== TimerPhase.Pending;
  return false;
}
```

Then replace the `disableAddTime` line inside the returned object:

```ts
    disableAddTime: !canAddTimeInState(playback, timerPhase),
```

(Remove the old `disableAddTime: playback !== Playback.Play && playback !== Playback.Pause,`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter ontime-ui exec vitest run src/features/control/playback/__tests__/playbackControl.utils.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/features/control/playback/playbackControl.utils.ts apps/client/src/features/control/playback/__tests__/playbackControl.utils.test.ts
git commit -m "$(cat <<'MSG'
(Claude Code + Opus 4.8) playback: Allow add-time in running Roll (logic)

canAddTimeInState() is the single source of truth: Play/Pause always, Roll only
while actively running (not Pending). disableAddTime now uses it.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FL51PrQsG1bYpupXjFTzCR
MSG
)"
```

---

## Task 2: Enable the add-time buttons in Roll (UI wiring)

**Files:**
- Modify: `apps/client/src/features/control/playback/add-time/AddTime.tsx`
- Modify: `apps/client/src/features/control/playback/PlaybackControl.tsx`

**Interfaces:**
- Consumes: `canAddTimeInState(playback, phase)` from Task 1; `TimerPhase` from `ontime-types`; `usePlaybackControl().timerPhase` (already provided by the selector).
- Produces: `AddTime` now accepts `{ playback: Playback; timerPhase: TimerPhase }`.

- [ ] **Step 1: Update `AddTime.tsx` to take `timerPhase` and use the helper**

Replace the imports/props/`canAddTime` region. New top of file through the props:

```tsx
import { useLocalStorage } from '@mantine/hooks';
import { Playback, TimerPhase } from 'ontime-types';
import { MILLIS_PER_HOUR, parseUserTime } from 'ontime-utils';
import { IoAdd, IoRemove } from 'react-icons/io5';

import TimeInput from '../../../../common/components/input/time-input/TimeInput';
import { setPlayback } from '../../../../common/hooks/useSocket';
import { canAddTimeInState } from '../playbackControl.utils';
import TapButton from '../tap-button/TapButton';

import style from './AddTime.module.scss';

interface AddTimeProps {
  playback: Playback;
  timerPhase: TimerPhase;
}

export default function AddTime(props: AddTimeProps) {
  const { playback, timerPhase } = props;
```

Then replace the `canAddTime` line inside the component:

```tsx
  const canAddTime = canAddTimeInState(playback, timerPhase);
```

(Leave `doDisableButtons = !canAddTime || timeInMs === 0;` and the rest unchanged.)

- [ ] **Step 2: Pass `timerPhase` from `PlaybackControl.tsx`**

In `apps/client/src/features/control/playback/PlaybackControl.tsx`, update the `AddTime` usage (line ~15):

```tsx
        <AddTime playback={data.playback} timerPhase={data.timerPhase} />
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter ontime-ui typecheck`
Expected: PASS (no type errors).

- [ ] **Step 4: Manual verification (live app)**

With the dev server running (see "Running the app" at bottom): load a rundown, press **Roll** so an event is actively running, and confirm the **+ / −** buttons are now enabled and clicking **+** bumps the timer's "Expect end" and shows the "Added" indicator. During the "Roll: Countdown to start" (Pending) phase, confirm the buttons are disabled.

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/features/control/playback/add-time/AddTime.tsx apps/client/src/features/control/playback/PlaybackControl.tsx
git commit -m "$(cat <<'MSG'
(Claude Code + Opus 4.8) playback: Enable add-time buttons during Roll

AddTime now takes timerPhase and uses canAddTimeInState, so +/- work while an
event is actively rolling (disabled during the waiting-to-roll phase).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FL51PrQsG1bYpupXjFTzCR
MSG
)"
```

---

## Task 3: `showScheduledEnd` preference in `editorSettings`

**Files:**
- Modify: `apps/client/src/common/stores/editorSettings.ts`
- Test: `apps/client/src/common/stores/__tests__/editorSettings.test.ts` (create)

**Interfaces:**
- Produces: `useEditorSettings` store gains `showScheduledEnd: boolean` (default `false`) and `setShowScheduledEnd: (value: boolean) => void`, persisted to `localStorage` under key `ontime-show-scheduled-end`.

- [ ] **Step 1: Write the failing test**

Create `apps/client/src/common/stores/__tests__/editorSettings.test.ts`:

```ts
import { useEditorSettings } from '../editorSettings';

describe('editorSettings showScheduledEnd', () => {
  test('exposes the flag and defaults to a boolean', () => {
    expect(typeof useEditorSettings.getState().showScheduledEnd).toBe('boolean');
  });

  test('setter updates state and persists to localStorage', () => {
    useEditorSettings.getState().setShowScheduledEnd(true);
    expect(useEditorSettings.getState().showScheduledEnd).toBe(true);
    expect(localStorage.getItem('ontime-show-scheduled-end')).toBe('true');

    useEditorSettings.getState().setShowScheduledEnd(false);
    expect(useEditorSettings.getState().showScheduledEnd).toBe(false);
    expect(localStorage.getItem('ontime-show-scheduled-end')).toBe('false');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter ontime-ui exec vitest run src/common/stores/__tests__/editorSettings.test.ts`
Expected: FAIL — `showScheduledEnd` / `setShowScheduledEnd` undefined.

- [ ] **Step 3: Add the field, setter, key, and default**

In `apps/client/src/common/stores/editorSettings.ts`:

Add to the `EditorSettingsStore` type (after `inheritGroupColour: boolean;`):

```ts
  showScheduledEnd: boolean;
```

Add to the same type's setter group (after `setDefaultEndAction: ...;`):

```ts
  setShowScheduledEnd: (showScheduledEnd: boolean) => void;
```

Add to `editorSettingsDefaults` (after `inheritGroupColour: false,`):

```ts
  showScheduledEnd: false,
```

Add to the `EditorSettingsKeys` enum (after `InheritGroupColour = ...`):

```ts
  ShowScheduledEnd = 'ontime-show-scheduled-end',
```

Add to the store's returned state (after the `inheritGroupColour: booleanFromLocalStorage(...)` block):

```ts
    showScheduledEnd: booleanFromLocalStorage(
      EditorSettingsKeys.ShowScheduledEnd,
      editorSettingsDefaults.showScheduledEnd,
    ),
```

Add the setter (after `setInheritGroupColour`):

```ts
    setShowScheduledEnd: (showScheduledEnd) =>
      set(() => {
        localStorage.setItem(EditorSettingsKeys.ShowScheduledEnd, String(showScheduledEnd));
        return { showScheduledEnd };
      }),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter ontime-ui exec vitest run src/common/stores/__tests__/editorSettings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/common/stores/editorSettings.ts apps/client/src/common/stores/__tests__/editorSettings.test.ts
git commit -m "$(cat <<'MSG'
(Claude Code + Opus 4.8) editor-settings: Add showScheduledEnd preference

Per-browser localStorage flag (default off) controlling whether the timer view
reveals the scheduled-end line beside the projected end.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FL51PrQsG1bYpupXjFTzCR
MSG
)"
```

---

## Task 4: Main timer — Projected/Scheduled end + toggle

**Files:**
- Modify: `apps/client/src/common/hooks/useSocket.ts` (add selector)
- Modify: `apps/client/src/features/control/playback/playback-timer/PlaybackTimer.tsx`

**Interfaces:**
- Consumes: `useEditorSettings().showScheduledEnd` + `setShowScheduledEnd` (Task 3); `timer.expectedFinish` from `useTimer()`.
- Produces: `useSelectedEventScheduledEnd(): MaybeNumber` selector = `state.eventNow?.timeEnd ?? null`.

- [ ] **Step 1: Add the scheduled-end selector**

In `apps/client/src/common/hooks/useSocket.ts`, directly below the existing `useSelectedEventId` export (line ~131):

```ts
export const useSelectedEventScheduledEnd = createSelector((state: RuntimeStore) => state.eventNow?.timeEnd ?? null);
```

- [ ] **Step 2: Relabel, add scheduled line, and add the toggle in `PlaybackTimer.tsx`**

Update the imports at the top of `apps/client/src/features/control/playback/playback-timer/PlaybackTimer.tsx` to add these:

```tsx
import { IoEyeOffOutline, IoEyeOutline } from 'react-icons/io5';

import { useEditorSettings } from '../../../../common/stores/editorSettings';
import { useSelectedEventScheduledEnd, useTimer } from '../../../../common/hooks/useSocket';
import TapButton from '../tap-button/TapButton';
```

(Note: `useTimer` is already imported from `useSocket`; merge it into the single import line rather than duplicating.)

In the `PlaybackTimer` component body, after `const timer = useTimer();`, add:

```tsx
  const scheduledEnd = useSelectedEventScheduledEnd();
  const showScheduledEnd = useEditorSettings((state) => state.showScheduledEnd);
  const setShowScheduledEnd = useEditorSettings((state) => state.setShowScheduledEnd);
```

Replace the `.status` block so it passes the new props and renders the toggle. Replace:

```tsx
      <div className={style.status}>
        {isWaiting ? (
          <span className={style.rolltag}>Roll: Countdown to start</span>
        ) : (
          <RunningStatus startedAt={timer.startedAt} expectedFinish={timer.expectedFinish} playback={timer.playback} />
        )}
      </div>
```

with:

```tsx
      <div className={style.status}>
        {isWaiting ? (
          <span className={style.rolltag}>Roll: Countdown to start</span>
        ) : (
          <RunningStatus
            startedAt={timer.startedAt}
            expectedFinish={timer.expectedFinish}
            playback={timer.playback}
            scheduledEnd={scheduledEnd}
            showScheduledEnd={showScheduledEnd}
          />
        )}
        <TapButton
          onClick={() => setShowScheduledEnd(!showScheduledEnd)}
          active={showScheduledEnd}
          aspect='tight'
          className={style.scheduledEndToggle}
        >
          {showScheduledEnd ? (
            <IoEyeOutline title='Hide scheduled end' />
          ) : (
            <IoEyeOffOutline title='Show scheduled end' />
          )}
        </TapButton>
      </div>
```

Update `RunningStatusProps` and the `RunningStatus` component. Replace the interface:

```tsx
interface RunningStatusProps {
  startedAt: MaybeNumber;
  expectedFinish: MaybeNumber;
  playback: Playback;
  scheduledEnd: MaybeNumber;
  showScheduledEnd: boolean;
}
```

Replace the `RunningStatus` function body:

```tsx
function RunningStatus({ startedAt, expectedFinish, playback, scheduledEnd, showScheduledEnd }: RunningStatusProps) {
  if (playback === Playback.Stop) {
    return <StoppedStatus />;
  }

  const started = millisToString(startedAt);
  const finishedMs = expectedFinish !== null ? expectedFinish % dayInMs : null;
  const finish = millisToString(finishedMs);
  const scheduledMs = scheduledEnd !== null ? scheduledEnd % dayInMs : null;
  const scheduled = millisToString(scheduledMs);

  return (
    <>
      <span className={style.start}>
        <span className={style.tag}>Started at</span>
        <span className={style.time}>{started}</span>
      </span>
      {showScheduledEnd && (
        <span className={style.finish}>
          <span className={style.tag}>Scheduled end</span>
          <span className={style.time}>{scheduled}</span>
        </span>
      )}
      <span className={style.finish}>
        <span className={style.tag}>Projected end</span>
        <span className={style.time}>{finish}</span>
      </span>
    </>
  );
}
```

- [ ] **Step 3: Add minimal style for the toggle**

Append to `apps/client/src/features/control/playback/playback-timer/PlaybackTimer.module.scss`:

```scss
.scheduledEndToggle {
  margin-left: auto;
  padding: 0.25rem;
  min-width: unset;
  align-self: center;
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter ontime-ui typecheck`
Expected: PASS.

- [ ] **Step 5: Manual verification (live app)**

Start/roll an event. Confirm the timer shows **"Projected end"** always; clicking the eye toggle reveals/hides a **"Scheduled end"** line above it; the toggle state survives a page reload (localStorage). With scheduled-end shown, add a minute in Roll and confirm Projected end moves while Scheduled end stays put. If the toggle button crowds the layout, adjust `.scheduledEndToggle` spacing and re-verify.

- [ ] **Step 6: Commit**

```bash
git add apps/client/src/common/hooks/useSocket.ts apps/client/src/features/control/playback/playback-timer/PlaybackTimer.tsx apps/client/src/features/control/playback/playback-timer/PlaybackTimer.module.scss
git commit -m "$(cat <<'MSG'
(Claude Code + Opus 4.8) playback-timer: Projected end + opt-in scheduled end

Relabel Expect end -> Projected end (always shown). Eye toggle reveals a
Scheduled end line (eventNow.timeEnd) via the showScheduledEnd preference.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FL51PrQsG1bYpupXjFTzCR
MSG
)"
```

---

## Task 5: Report util — `projectedEnd` in `CombinedReport` + CSV

**Files:**
- Modify: `apps/client/src/features/app-settings/panel/feature-panel/reportSettings.utils.ts`
- Test: `apps/client/src/features/app-settings/panel/feature-panel/__tests__/reportSettings.utils.test.ts` (create)

**Interfaces:**
- Produces:
  - `CombinedReport` gains `projectedEnd: MaybeNumber`.
  - `getCombinedReport(report, rundown, flatOrder, running)` — new 4th param `running: { id: EntryId; expectedFinish: MaybeNumber } | null`. For the row whose `id === running.id`, `projectedEnd = running.expectedFinish`; otherwise `null`.
  - CSV gains a "Projected End" column, placed after "Scheduled End" and before "Actual End".

- [ ] **Step 1: Write the failing test**

Create `apps/client/src/features/app-settings/panel/feature-panel/__tests__/reportSettings.utils.test.ts`:

```ts
import { OntimeReport, RundownEntries, SupportedEntry } from 'ontime-types';

import { getCombinedReport, makeReportCSV } from '../reportSettings.utils';

function makeEvent(id: string, cue: string, timeStart: number, timeEnd: number) {
  return {
    id,
    type: SupportedEntry.Event,
    cue,
    title: `Event ${cue}`,
    timeStart,
    timeEnd,
  } as unknown as RundownEntries[string];
}

const rundown: RundownEntries = {
  a: makeEvent('a', '1', 0, 600000),
  b: makeEvent('b', '2', 600000, 1200000),
};
const flatOrder = ['a', 'b'];
const report: OntimeReport = {
  a: { startedAt: 0, endedAt: 600000 },
  b: { startedAt: 600000, endedAt: null },
};

describe('getCombinedReport() projectedEnd', () => {
  test('sets projectedEnd on the running event row only', () => {
    const combined = getCombinedReport(report, rundown, flatOrder, { id: 'b', expectedFinish: 1500000 });
    const rowA = combined.find((r) => r.id === 'a');
    const rowB = combined.find((r) => r.id === 'b');
    expect(rowA?.projectedEnd).toBeNull();
    expect(rowB?.projectedEnd).toBe(1500000);
  });

  test('projectedEnd is null for all rows when nothing is running', () => {
    const combined = getCombinedReport(report, rundown, flatOrder, null);
    expect(combined.every((r) => r.projectedEnd === null)).toBe(true);
  });
});

describe('makeReportCSV()', () => {
  test('includes a Projected End column after Scheduled End', () => {
    const combined = getCombinedReport(report, rundown, flatOrder, { id: 'b', expectedFinish: 1500000 });
    const csv = makeReportCSV(combined);
    const header = csv.split('\n')[0];
    expect(header).toContain('Projected End');
    expect(header.indexOf('Projected End')).toBeGreaterThan(header.indexOf('Scheduled End'));
    expect(header.indexOf('Projected End')).toBeLessThan(header.indexOf('Actual End'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter ontime-ui exec vitest run src/features/app-settings/panel/feature-panel/__tests__/reportSettings.utils.test.ts`
Expected: FAIL — `getCombinedReport` takes 3 args / `projectedEnd` missing / header lacks "Projected End".

- [ ] **Step 3: Implement**

In `apps/client/src/features/app-settings/panel/feature-panel/reportSettings.utils.ts`:

Update the import to include `MaybeNumber` and `EntryId` (they are already imported alongside the others — ensure the import line reads):

```ts
import { EntryId, MaybeNumber, OntimeReport, RundownEntries, isOntimeEvent } from 'ontime-types';
```

Add `projectedEnd` to the type:

```ts
export type CombinedReport = {
  id: EntryId;
  index: number;
  title: string;
  cue: string;
  scheduledStart: number;
  actualStart: MaybeNumber;
  scheduledEnd: number;
  actualEnd: MaybeNumber;
  projectedEnd: MaybeNumber;
};
```

Change the signature and both push sites of `getCombinedReport`:

```ts
export function getCombinedReport(
  report: OntimeReport,
  rundown: RundownEntries,
  flatOrder: EntryId[],
  running: { id: EntryId; expectedFinish: MaybeNumber } | null,
): CombinedReport[] {
```

In the loop, compute the projected end once per entry and include it in **both** push branches:

```ts
    const projectedEnd = running?.id === id ? running.expectedFinish : null;
```

- In the `!(id in report)` branch object add `projectedEnd,` (alongside the other fields).
- In the `id in report` branch object add `projectedEnd,`.

Update the CSV header and row builder:

```ts
const csvHeader = ['Index', 'Title', 'Cue', 'Scheduled Start', 'Actual Start', 'Scheduled End', 'Projected End', 'Actual End'];
```

In `makeReportCSV`, insert the projected-end cell after `formatTime(entry.scheduledEnd)`:

```ts
    csv.push([
      String(entry.index),
      entry.title,
      entry.cue,
      formatTime(entry.scheduledStart),
      formatTime(entry.actualStart),
      formatTime(entry.scheduledEnd),
      formatTime(entry.projectedEnd),
      formatTime(entry.actualEnd),
    ]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter ontime-ui exec vitest run src/features/app-settings/panel/feature-panel/__tests__/reportSettings.utils.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/features/app-settings/panel/feature-panel/reportSettings.utils.ts apps/client/src/features/app-settings/panel/feature-panel/__tests__/reportSettings.utils.test.ts
git commit -m "$(cat <<'MSG'
(Claude Code + Opus 4.8) report: Add projectedEnd to combined report + CSV

getCombinedReport takes the running event (id + expectedFinish) and sets
projectedEnd on that row; CSV gains a Projected End column.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FL51PrQsG1bYpupXjFTzCR
MSG
)"
```

---

## Task 6: Report view — wire live projected end + render column

**Files:**
- Modify: `apps/client/src/features/app-settings/panel/feature-panel/ReportSettings.tsx`

**Interfaces:**
- Consumes: `getCombinedReport(..., running)` (Task 5); `useSelectedEventId()` and `useTimer()` from `useSocket`; `Playback` from `ontime-types`.

- [ ] **Step 1: Feed live runtime into the combined report**

In `apps/client/src/features/app-settings/panel/feature-panel/ReportSettings.tsx`:

Add imports:

```tsx
import { Playback } from 'ontime-types';

import { useSelectedEventId, useTimer } from '../../../../common/hooks/useSocket';
```

In the component, after `const { data } = useRundown();`:

```tsx
  const selectedEventId = useSelectedEventId();
  const timer = useTimer();
  const running =
    selectedEventId !== null && timer.playback !== Playback.Stop
      ? { id: selectedEventId, expectedFinish: timer.expectedFinish }
      : null;
```

Update the memo to pass `running` (and add it to the deps):

```tsx
  const combinedReport = useMemo(() => {
    return getCombinedReport(reportData, data.entries, data.flatOrder, running);
  }, [reportData, data.entries, data.flatOrder, running]);
```

- [ ] **Step 2: Render the Projected End column**

Add a header cell after the `Scheduled End` `<th>`:

```tsx
                <th>Projected End</th>
```

Add the matching body cell after the scheduled-end `<th>` in the row (before the actual-end cell):

```tsx
                    <th>{formatTime(entry.projectedEnd)}</th>
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter ontime-ui typecheck`
Expected: PASS.

- [ ] **Step 4: Manual verification (live app)**

Open **Settings → Report** while an event is actively running (Play or Roll). Confirm the running event's row shows a live **Projected End** that shifts when you add/subtract time; non-running rows show `—`; after the event ends, **Actual End** fills in and Projected End clears. Export CSV and confirm the **Projected End** column is present between Scheduled End and Actual End.

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/features/app-settings/panel/feature-panel/ReportSettings.tsx
git commit -m "$(cat <<'MSG'
(Claude Code + Opus 4.8) report: Show live projected end for the running event

ReportSettings feeds the running event (id + expectedFinish) into
getCombinedReport and renders a Projected End column that updates live.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FL51PrQsG1bYpupXjFTzCR
MSG
)"
```

---

## Final verification

- [ ] Run the full client unit suite: `pnpm --filter ontime-ui exec vitest run` → all pass.
- [ ] `pnpm --filter ontime-ui typecheck` → clean.
- [ ] `pnpm --filter ontime-ui lint` → clean (fix any lint from touched files).
- [ ] End-to-end manual pass in the live app: Roll a show → add/subtract time works → main timer Projected end moves, Scheduled-end toggle reveals/hides and persists → report panel Projected End is live → event ends → Actual End reflects the extension → CSV has the column.

## Running the app (for manual verification)

The dev server may already be running from the main checkout on ports 3000/4001. To verify **this branch's** changes, run the dev server from this worktree instead (stop the other one first to free the ports):

```bash
source ~/.nvm/nvm.sh && nvm use 22
# from the worktree root:
pnpm install    # first time in the worktree, to populate node_modules
pnpm dev
```

Open http://localhost:4001/editor. Reach the report panel via Settings → Report.
