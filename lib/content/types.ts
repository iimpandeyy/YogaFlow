/**
 * Practice content model (SDD §5.1; ARCHITECTURE §4; Issue #8).
 *
 * The approved vocabularies below are mirrored by CHECK constraints in
 * `supabase/migrations/*_practice_content.sql`. They change only through a documented human decision
 * (Plan §1.4). A unit test keeps the two in sync.
 */

export const PRACTICE_TYPES = ["Yoga", "Breathwork", "Meditation"] as const;
export type PracticeType = (typeof PRACTICE_TYPES)[number];

export const DIFFICULTY_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
export type Difficulty = (typeof DIFFICULTY_LEVELS)[number];

export const BODY_FOCUS_VALUES = [
  "Full Body",
  "Back",
  "Hips",
  "Legs",
  "Shoulders",
  "Core",
] as const;
export type BodyFocus = (typeof BODY_FOCUS_VALUES)[number];

/** A practice as the application uses it. The slug is the stable practice ID. */
export interface Practice {
  /** Stable, unique, URL-safe identifier. Favorites/Routine store this value. */
  slug: string;
  title: string;
  type: PracticeType;
  /** Present when applicable (US-04). Yoga practices always have one. */
  difficulty: Difficulty | null;
  /** Empty when body focus does not apply. Yoga practices have at least one. */
  bodyFocus: BodyFocus[];
  summary: string;
  /** Ordered steps. */
  instructions: string[];
  /** Benefits / purpose, as general wellness information only. */
  benefits: string;
  /** Safety & Caution text; null only where no caution is relevant. */
  caution: string | null;
  image: {
    /** Path to a static asset under `public/`, for example `/images/practices/mountain-pose.svg`. */
    path: string;
    alt: string;
  };
  attribution: {
    source: string | null;
    license: string | null;
    imageAttribution: string | null;
    /** True while text or imagery is AI-written, unlicensed, or not yet human-reviewed. */
    isPlaceholder: boolean;
  };
}

/** A row of the `public.practices` table, exactly as Supabase returns it. */
export interface PracticeRow {
  slug: string;
  title: string;
  type: string;
  difficulty: string | null;
  body_focus: string[];
  summary: string;
  instructions: string[];
  benefits: string;
  caution: string | null;
  image_path: string;
  image_alt: string;
  source: string | null;
  license: string | null;
  image_attribution: string | null;
  is_placeholder: boolean;
}

/** Columns selected by the data-access layer (kept explicit; never `*`). */
export const PRACTICE_COLUMNS =
  "slug,title,type,difficulty,body_focus,summary,instructions,benefits,caution," +
  "image_path,image_alt,source,license,image_attribution,is_placeholder";

export function isPracticeType(value: unknown): value is PracticeType {
  return typeof value === "string" && (PRACTICE_TYPES as readonly string[]).includes(value);
}

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === "string" && (DIFFICULTY_LEVELS as readonly string[]).includes(value);
}

export function isBodyFocus(value: unknown): value is BodyFocus {
  return typeof value === "string" && (BODY_FOCUS_VALUES as readonly string[]).includes(value);
}
