/** Public entry point of the data-access layer. Screens import from `@/lib/content` only. */
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
