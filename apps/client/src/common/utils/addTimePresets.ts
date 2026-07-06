import { MILLIS_PER_HOUR } from 'ontime-utils';

/** Maximum number of add-time presets the UI exposes. */
export const MAX_ADD_TIME_PRESETS = 3;

/**
 * Normalises a set of add-time preset magnitudes (in milliseconds).
 *
 * Presets are symmetric magnitudes rendered as −X / +X pairs, so each entry must be a
 * positive, whole number of milliseconds, capped at 1 hour (matching the type-in field's
 * own cap), de-duplicated, and limited to {@link MAX_ADD_TIME_PRESETS} entries. Anything
 * that can't be coerced to a usable magnitude is dropped rather than throwing, so partial
 * or hand-edited input degrades gracefully.
 */
export function sanitizeAddTimePresets(values: unknown): number[] {
  if (!Array.isArray(values)) return [];

  const seen = new Set<number>();
  const result: number[] = [];

  for (const value of values) {
    const asNumber = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(asNumber)) continue;

    // presets are symmetric, so we only track the magnitude and cap it like the type-in field
    const magnitude = Math.min(Math.round(Math.abs(asNumber)), MILLIS_PER_HOUR);
    if (magnitude <= 0) continue;
    if (seen.has(magnitude)) continue;

    seen.add(magnitude);
    result.push(magnitude);
    if (result.length >= MAX_ADD_TIME_PRESETS) break;
  }

  return result;
}

/**
 * Parses presets from their JSON localStorage representation, sanitising the result and
 * falling back to the provided defaults on missing or malformed input.
 */
export function parseAddTimePresets(raw: string | null, fallback: number[]): number[] {
  if (raw === null) return sanitizeAddTimePresets(fallback);

  try {
    return sanitizeAddTimePresets(JSON.parse(raw));
  } catch {
    return sanitizeAddTimePresets(fallback);
  }
}

/** Serialises presets for localStorage. */
export function serializeAddTimePresets(presets: number[]): string {
  return JSON.stringify(sanitizeAddTimePresets(presets));
}
