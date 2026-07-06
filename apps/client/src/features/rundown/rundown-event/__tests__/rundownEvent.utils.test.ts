import { formatAddedTimeChip, formatDelay } from '../rundownEvent.utils';

describe('formatDelay()', () => {
  it('adds a given delay to the start time', () => {
    const timeStart = 60000; // 1 min
    const delay = 60000; // 1 min
    const result = formatDelay(timeStart, delay);
    expect(result).toEqual('New start 00:02');
  });
});

describe('formatAddedTimeChip()', () => {
  it('returns null when no time has been added', () => {
    expect(formatAddedTimeChip(0)).toBeNull();
  });

  it('shows added time as an "over" chip with a + sign', () => {
    expect(formatAddedTimeChip(5 * 60000)).toEqual({ value: '+5m', tone: 'over' });
  });

  it('shows removed time as an "under" chip with a - sign', () => {
    expect(formatAddedTimeChip(-5 * 60000)).toEqual({ value: '-5m', tone: 'under' });
  });

  it('includes seconds for adjustments under two minutes', () => {
    expect(formatAddedTimeChip(90000)).toEqual({ value: '+1m30s', tone: 'over' });
  });
});
