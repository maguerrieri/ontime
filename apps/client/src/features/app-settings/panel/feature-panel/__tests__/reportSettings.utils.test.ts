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
