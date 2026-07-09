import { MILLIS_PER_MINUTE, millisToString, removeTrailingZero } from 'ontime-utils';

import { formatDuration } from '../../../common/utils/time';

/**
 * Formats the running event's added/removed time for its rundown chip.
 * Mirrors the over/under chip: `+` (over, orange) for added time, `-` (under,
 * green) for removed time; null when no time has been added or removed.
 */
export function formatAddedTimeChip(addedTime: number): { value: string; tone: 'over' | 'under' } | null {
  if (!addedTime) return null;
  const isOver = addedTime > 0;
  const abs = Math.abs(addedTime);
  const value = `${isOver ? '+' : '-'}${formatDuration(abs, abs > 2 * MILLIS_PER_MINUTE)}`;
  return { value, tone: isOver ? 'over' : 'under' };
}

export function formatDelay(timeStart: number, delay: number): string | undefined {
  if (!delay) return;

  const delayedStart = Math.max(0, timeStart + delay);

  const timeTag = removeTrailingZero(millisToString(delayedStart));
  return `New start ${timeTag}`;
}
export function formatGap(gap: number, isNextDay: boolean) {
  if (gap === 0) {
    if (isNextDay) {
      // We show a next day warning even if there is no gap
      return '(next day)';
    }
    return;
  }

  const gapString = formatDuration(Math.abs(gap), false);
  return `${gap < 0 ? 'Overlap' : 'Gap'} ${gapString}${isNextDay ? ' (next day)' : ''}`;
}
