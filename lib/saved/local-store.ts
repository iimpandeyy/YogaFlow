import {
  STORAGE_KEY,
  isPracticeSlug,
  parseStoredValue,
  serializeStoredValue,
} from "./storage-format";
import type { SavedCollection, SavedPracticesState, SavedPracticesStore } from "./types";

/** The parts of the Web Storage API this store uses. */
export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export interface LocalSavedPracticesStoreOptions {
  /**
   * Returns the storage to use, or null if there is none. Defaults to `window.localStorage`.
   * Reading `window.localStorage` itself can throw (blocked storage), so it is accessed lazily.
   */
  getStorage?: () => StorageLike | null;
  /** Window to listen on for `storage` events from other tabs. Defaults to `window` if present. */
  eventTarget?: Pick<Window, "addEventListener" | "removeEventListener"> | null;
}

const SERVER_STATE: SavedPracticesState = Object.freeze({
  hydrated: false,
  favorites: Object.freeze([]) as readonly string[],
  routine: Object.freeze([]) as readonly string[],
});

function defaultGetStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  return window.localStorage ?? null;
}

function defaultEventTarget() {
  return typeof window === "undefined" ? null : window;
}

function sameList(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((slug, index) => slug === b[index]);
}

/**
 * Favorites and Routine kept in memory and mirrored to `localStorage` (OQ-01).
 *
 * If storage is missing, blocked, full, or holds corrupted data, the store keeps working in memory
 * for the current page and never throws. It makes no network calls.
 */
export function createLocalSavedPracticesStore(
  options: LocalSavedPracticesStoreOptions = {},
): SavedPracticesStore {
  const getStorage = options.getStorage ?? defaultGetStorage;
  const eventTarget =
    options.eventTarget === undefined ? defaultEventTarget() : options.eventTarget;

  let state: SavedPracticesState = SERVER_STATE;
  const listeners = new Set<() => void>();

  function setState(next: SavedPracticesState) {
    if (
      next.hydrated === state.hydrated &&
      sameList(next.favorites, state.favorites) &&
      sameList(next.routine, state.routine)
    ) {
      return;
    }
    state = next;
    for (const listener of listeners) listener();
  }

  function readStorage() {
    try {
      const storage = getStorage();
      return parseStoredValue(storage ? storage.getItem(STORAGE_KEY) : null);
    } catch {
      return parseStoredValue(null);
    }
  }

  function writeStorage(next: SavedPracticesState) {
    try {
      getStorage()?.setItem(STORAGE_KEY, serializeStoredValue(next));
    } catch {
      // Unavailable or full storage: keep the in-memory state for this page.
    }
  }

  function hydrate() {
    const stored = readStorage();
    setState({ hydrated: true, favorites: stored.favorites, routine: stored.routine });
  }

  function ensureHydrated() {
    // Load first so a change made before hydration cannot overwrite what is already saved.
    if (!state.hydrated) hydrate();
  }

  function onStorageEvent(event: StorageEvent) {
    // `key === null` means another tab cleared storage.
    if (event.key === STORAGE_KEY || event.key === null) hydrate();
  }

  return {
    getSnapshot: () => state,
    getServerSnapshot: () => SERVER_STATE,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    connect() {
      hydrate();
      eventTarget?.addEventListener("storage", onStorageEvent);
      return () => eventTarget?.removeEventListener("storage", onStorageEvent);
    },
    add(collection: SavedCollection, slug: string) {
      if (!isPracticeSlug(slug)) return false;
      ensureHydrated();
      if (state[collection].includes(slug)) return false;
      const next = { ...state, [collection]: [...state[collection], slug] };
      setState(next);
      writeStorage(next);
      return true;
    },
    remove(collection: SavedCollection, slug: string) {
      ensureHydrated();
      if (!state[collection].includes(slug)) return false;
      const next = { ...state, [collection]: state[collection].filter((item) => item !== slug) };
      setState(next);
      writeStorage(next);
      return true;
    },
    has: (collection: SavedCollection, slug: string) => state[collection].includes(slug),
    list: (collection: SavedCollection) => state[collection],
  };
}
