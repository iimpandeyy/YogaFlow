/**
 * Saved-practices contract (Issue #15; SDD §2.2, US-07, US-08; OQ-01).
 *
 * Favorites and Routine hold practice slugs only (the stable practice ID from `lib/content`).
 * UIs depend on this interface, not on `localStorage`, so an account-backed implementation could
 * replace the local one later without UI changes. Any such change needs an owner decision (OQ-01).
 */

export const SAVED_COLLECTIONS = ["favorites", "routine"] as const;
export type SavedCollection = (typeof SAVED_COLLECTIONS)[number];

export interface SavedPracticesState {
  /**
   * False on the server and on the first client render. True once persisted state has been loaded
   * (or found unavailable). UIs should not show a saved/unsaved state before this is true.
   */
  readonly hydrated: boolean;
  /** Favorite practice slugs, oldest first, no duplicates. */
  readonly favorites: readonly string[];
  /** Routine practice slugs in the order they were added, no duplicates (D5). */
  readonly routine: readonly string[];
}

export interface SavedPracticesStore {
  /** Current state. The same object is returned until something changes. */
  getSnapshot(): SavedPracticesState;
  /** Always the empty, not-hydrated state, so server and first client render match. */
  getServerSnapshot(): SavedPracticesState;
  subscribe(listener: () => void): () => void;
  /** Loads persisted state and starts listening for outside changes. Returns a cleanup function. */
  connect(): () => void;
  /** Adds a slug at the end. Returns false (no-op) if it is already present or not a valid slug. */
  add(collection: SavedCollection, slug: string): boolean;
  /** Removes a slug. Returns false if it was not present. */
  remove(collection: SavedCollection, slug: string): boolean;
  has(collection: SavedCollection, slug: string): boolean;
  list(collection: SavedCollection): readonly string[];
}
