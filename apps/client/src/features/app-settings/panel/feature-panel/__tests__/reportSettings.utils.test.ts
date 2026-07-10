import { OntimeReport, Playback, RundownEntries, SupportedEntry, TimerPhase } from 'ontime-types';

import { getCombinedReport, isTimerActivelyRunning, makeReportCSV, overlayProjectedEnd } from '../reportSettings.utils';

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

describe('overlayProjectedEnd()', () => {
  test('overlays the running row and leaves the rest untouched', () => {
    const staticReport = getCombinedReport(report, rundown, flatOrder, null);
    const overlaid = overlayProjectedEnd(staticReport, { id: 'b', expectedFinish: 1500000 });
    expect(overlaid.find((r) => r.id === 'a')?.projectedEnd).toBeNull();
    expect(overlaid.find((r) => r.id === 'b')?.projectedEnd).toBe(1500000);
  });

  test('returns the report unchanged when nothing is running', () => {
    const staticReport = getCombinedReport(report, rundown, flatOrder, null);
    expect(overlayProjectedEnd(staticReport, null)).toBe(staticReport);
  });
});

describe('isTimerActivelyRunning()', () => {
  test('true while Play, Pause and actively rolling', () => {
    expect(isTimerActivelyRunning(Playback.Play, TimerPhase.Default)).toBe(true);
    expect(isTimerActivelyRunning(Playback.Pause, TimerPhase.Default)).toBe(true);
    expect(isTimerActivelyRunning(Playback.Roll, TimerPhase.Default)).toBe(true);
    expect(isTimerActivelyRunning(Playback.Roll, TimerPhase.Overtime)).toBe(true);
  });

  test('false when stopped or waiting to roll', () => {
    expect(isTimerActivelyRunning(Playback.Stop, TimerPhase.None)).toBe(false);
    expect(isTimerActivelyRunning(Playback.Roll, TimerPhase.Pending)).toBe(false);
  });
});

describe('makeReportCSV()', () => {
  test('includes a Projected End column after Scheduled End', () => {
    const combined = getCombinedReport(report, rundown, flatOrder, { id: 'b', expectedFinish: 1500000 });
    const csv = makeReportCSV(combined);
    const header = csv.split(/\r?\n/)[0];
    expect(header).toContain('Projected End');
    expect(header.indexOf('Projected End')).toBeGreaterThan(header.indexOf('Scheduled End'));
    expect(header.indexOf('Projected End')).toBeLessThan(header.indexOf('Actual End'));
  });
});
