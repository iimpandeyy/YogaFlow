/**
 * Public entry point of the data-access layer. Screens import from `@/lib/content` only.
 *
 * - Choose user-facing copy from `reason` / `error.kind` only; never render `error.message`.
 *   Only `kind` crosses the server → client boundary.
 * - Routes that call these functions must render dynamically (`await connection()` or
 *   `export const dynamic = "force-dynamic"`; ARCHITECTURE §10 item 1, owner decision), or the
 *   build would bake in a not-configured page.
 */
export {
  getPracticeBySlug,
  listPractices,
  type ContentError,
  type ContentErrorKind,
  type ContentFailure,
  type ContentNotFound,
  type PracticeListResult,
  type PracticeResult,
} from "./practices";
export {
  BODY_FOCUS_VALUES,
  DIFFICULTY_LEVELS,
  PRACTICE_TYPES,
  type BodyFocus,
  type Difficulty,
  type Practice,
  type PracticeType,
} from "./types";
