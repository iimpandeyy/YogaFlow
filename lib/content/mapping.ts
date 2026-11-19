import {
  isBodyFocus,
  isDifficulty,
  isPracticeType,
  type BodyFocus,
  type Practice,
  type PracticeRow,
} from "./types";

/**
 * Converts a database row into a `Practice`, re-checking the approved vocabularies at runtime.
 * Returns null when the row does not match the content contract, so the caller can report a
 * typed failure instead of rendering inconsistent data.
 */

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function mapPracticeRow(input: unknown): Practice | null {
  if (typeof input !== "object" || input === null) return null;
  const row = input as Partial<Record<keyof PracticeRow, unknown>>;

  if (!isNonEmptyString(row.slug) || !SLUG_PATTERN.test(row.slug)) return null;
  if (!isNonEmptyString(row.title)) return null;
  if (!isPracticeType(row.type)) return null;
  if (row.difficulty !== null && !isDifficulty(row.difficulty)) return null;
  if (!Array.isArray(row.body_focus) || !row.body_focus.every(isBodyFocus)) return null;
  if (!isNonEmptyString(row.summary)) return null;
  if (!Array.isArray(row.instructions) || row.instructions.length === 0) return null;
  if (!row.instructions.every(isNonEmptyString)) return null;
  if (!isNonEmptyString(row.benefits)) return null;
  if (!isOptionalString(row.caution)) return null;
  if (!isNonEmptyString(row.image_path) || !row.image_path.startsWith("/")) return null;
  if (!isNonEmptyString(row.image_alt)) return null;
  if (!isOptionalString(row.source) || !isOptionalString(row.license)) return null;
  if (!isOptionalString(row.image_attribution)) return null;
  if (typeof row.is_placeholder !== "boolean") return null;

  const bodyFocus = row.body_focus as BodyFocus[];
  if (row.type === "Yoga" && (row.difficulty === null || bodyFocus.length === 0)) return null;

  return {
    slug: row.slug,
    title: row.title,
    type: row.type,
    difficulty: row.difficulty,
    bodyFocus: [...bodyFocus],
    summary: row.summary,
    instructions: [...(row.instructions as string[])],
    benefits: row.benefits,
    caution: row.caution,
    image: { path: row.image_path, alt: row.image_alt },
    attribution: {
      source: row.source,
      license: row.license,
      imageAttribution: row.image_attribution,
      isPlaceholder: row.is_placeholder,
    },
  };
}
