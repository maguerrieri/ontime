import { MILLIS_PER_HOUR } from 'ontime-utils';

import {
  MAX_ADD_TIME_PRESETS,
  parseAddTimePresets,
  sanitizeAddTimePresets,
  serializeAddTimePresets,
} from '../addTimePresets';

describe('sanitizeAddTimePresets', () => {
  test('keeps valid positive magnitudes as-is', () => {
    expect(sanitizeAddTimePresets([60_000, 300_000])).toEqual([60_000, 300_000]);
  });

  test('coerces negatives to their magnitude (presets are symmetric)', () => {
    expect(sanitizeAddTimePresets([-60_000])).toEqual([60_000]);
  });

  test('drops zero and non-finite entries', () => {
    expect(sanitizeAddTimePresets([0, NaN, Infinity, 60_000])).toEqual([60_000]);
  });

  test('rounds fractional milliseconds', () => {
    expect(sanitizeAddTimePresets([60_000.4, 300_000.6])).toEqual([60_000, 300_001]);
  });

  test('caps each preset at one hour', () => {
    expect(sanitizeAddTimePresets([MILLIS_PER_HOUR + 1, 2 * MILLIS_PER_HOUR])).toEqual([MILLIS_PER_HOUR]);
  });

  test('de-duplicates repeated magnitudes', () => {
    expect(sanitizeAddTimePresets([60_000, 60_000, 300_000])).toEqual([60_000, 300_000]);
  });

  test(`limits to ${MAX_ADD_TIME_PRESETS} entries`, () => {
    expect(sanitizeAddTimePresets([1_000, 2_000, 3_000, 4_000, 5_000])).toEqual([1_000, 2_000, 3_000]);
  });

  test('coerces numeric strings', () => {
    expect(sanitizeAddTimePresets(['60000', '300000'])).toEqual([60_000, 300_000]);
  });

  test('returns an empty array for non-array input', () => {
    expect(sanitizeAddTimePresets('nonsense')).toEqual([]);
    expect(sanitizeAddTimePresets(null)).toEqual([]);
    expect(sanitizeAddTimePresets(undefined)).toEqual([]);
  });
});

describe('parseAddTimePresets', () => {
  const fallback = [60_000, 300_000];

  test('parses a valid JSON array from storage', () => {
    expect(parseAddTimePresets('[60000,300000]', fallback)).toEqual([60_000, 300_000]);
  });

  test('falls back when storage is empty (null)', () => {
    expect(parseAddTimePresets(null, fallback)).toEqual(fallback);
  });

  test('falls back on malformed JSON', () => {
    expect(parseAddTimePresets('not json', fallback)).toEqual(fallback);
  });

  test('sanitises a stored array with junk entries', () => {
    expect(parseAddTimePresets('[0,-5000,"abc",300000]', fallback)).toEqual([5_000, 300_000]);
  });

  test('honours a stored empty array (user cleared all presets)', () => {
    expect(parseAddTimePresets('[]', fallback)).toEqual([]);
  });
});

describe('serializeAddTimePresets', () => {
  test('round-trips through parse', () => {
    const presets = [60_000, 300_000];
    expect(parseAddTimePresets(serializeAddTimePresets(presets), [])).toEqual(presets);
  });

  test('sanitises before serialising', () => {
    expect(serializeAddTimePresets([0, 60_000, NaN])).toBe('[60000]');
  });
});
