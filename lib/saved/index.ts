/**
 * Public entry point for saved practices (Favorites and Routine; Issue #15).
 *
 * - UI components use `useSavedPractices()` inside `SavedPracticesProvider` (mounted in the root
 *   layout). Check `hydrated` before showing saved/unsaved state.
 * - Pages turn saved slugs into practices with `resolveSavedPractices`, which skips stale slugs.
 * - Only practice slugs are stored, in this browser only. Nothing is sent to Supabase or a server.
 */
export { SavedPracticesProvider, useSavedPractices } from "./provider";
export type { SavedCollectionApi, SavedPractices } from "./provider";
export { createLocalSavedPracticesStore } from "./local-store";
export type { LocalSavedPracticesStoreOptions, StorageLike } from "./local-store";
export { findStaleSlugs, resolveSavedPractices } from "./resolve";
export { STORAGE_KEY, isPracticeSlug } from "./storage-format";
export { SAVED_COLLECTIONS } from "./types";
export type { SavedCollection, SavedPracticesState, SavedPracticesStore } from "./types";
