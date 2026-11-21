/**
 * The persisted format of saved practices. Pure functions; no browser access.
 *
 * Stored value under `STORAGE_KEY`: `{"favorites":["slug",...],"routine":["slug",...]}`.
 * Only practice slugs are stored: no names, emails, timestamps, or health data (RC-03; POLICY §3).
 */

/** Versioned key. A future format change uses a new key rather than reinterpreting this one. */
export const STORAGE_KEY = "yogaflow:v1";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Generous upper bound so a tampered value cannot make us keep huge strings. */
const MAX_SLUG_LENGTH = 200;

export interface StoredSavedPractices {
  favorites: string[];
  routine: string[];
}

export function isPracticeSlug(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(value);
}

/** Keeps valid slugs only, first occurrence wins, original order kept. */
export function sanitizeSlugs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (isPracticeSlug(item) && !seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

/**
 * Parses a raw stored value. Missing, corrupted, or wrongly shaped data yields empty collections;
 * a wrongly shaped field is dropped on its own without discarding the other one. Never throws.
 */
export function parseStoredValue(raw: string | null): StoredSavedPractices {
  if (raw === null) return { favorites: [], routine: [] };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { favorites: [], routine: [] };
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { favorites: [], routine: [] };
  }
  const record = data as Record<string, unknown>;
  return { favorites: sanitizeSlugs(record.favorites), routine: sanitizeSlugs(record.routine) };
}

/** Serializes exactly the two slug arrays and nothing else. */
export function serializeStoredValue(value: {
  favorites: readonly string[];
  routine: readonly string[];
}): string {
  const stored: StoredSavedPractices = {
    favorites: sanitizeSlugs(value.favorites),
    routine: sanitizeSlugs(value.routine),
  };
  return JSON.stringify(stored);
}
