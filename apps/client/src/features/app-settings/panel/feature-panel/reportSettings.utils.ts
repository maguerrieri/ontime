import { EntryId, MaybeNumber, OntimeReport, RundownEntries, isOntimeEvent } from 'ontime-types';

import { makeCSVFromArrayOfArrays } from '../../../../common/utils/csv';
import { formatTime } from '../../../../common/utils/time';

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

/**
 * Creates a combined report with the rundown data.
 * `running` carries the currently-loaded event's live expected finish, used to
 * show a projected end for the event that has not ended yet.
 */
export function getCombinedReport(
  report: OntimeReport,
  rundown: RundownEntries,
  flatOrder: EntryId[],
  running: { id: EntryId; expectedFinish: MaybeNumber } | null,
): CombinedReport[] {
  if (Object.keys(report).length === 0) return [];
  if (flatOrder.length === 0) return [];

  const combinedReport: CombinedReport[] = [];

  let index = 1;
  for (let i = 0; i < flatOrder.length; i++) {
    const id = flatOrder[i];
    const entry = rundown[id];
    if (!entry || !isOntimeEvent(entry)) continue;

    const projectedEnd = running?.id === id ? running.expectedFinish : null;

    if (!(id in report)) {
      combinedReport.push({
        id: id,
        index: index,
        title: entry.title,
        cue: entry.cue,
        scheduledStart: entry.timeStart,
        actualEnd: null,
        scheduledEnd: entry.timeEnd,
        actualStart: null,
        projectedEnd,
      });
    }

    if (id in report) {
      combinedReport.push({
        id: id,
        index: index,
        title: entry.title,
        cue: entry.cue,
        scheduledStart: entry.timeStart,
        actualEnd: report[id].endedAt,
        scheduledEnd: entry.timeEnd,
        actualStart: report[id].startedAt,
        projectedEnd,
      });
    }
    index++;
  }

  return combinedReport;
}

const csvHeader = [
  'Index',
  'Title',
  'Cue',
  'Scheduled Start',
  'Actual Start',
  'Scheduled End',
  'Projected End',
  'Actual End',
];

/**
 * Transforms a CombinedReport into a CSV string
 */
export function makeReportCSV(combinedReport: CombinedReport[]) {
  const csv: string[][] = [];
  csv.push(csvHeader);

  for (const entry of combinedReport) {
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
  }

  return makeCSVFromArrayOfArrays(csv);
}
