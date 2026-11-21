"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { createLocalSavedPracticesStore } from "./local-store";
import type { SavedCollection, SavedPracticesStore } from "./types";

const SavedPracticesContext = createContext<SavedPracticesStore | null>(null);

export function SavedPracticesProvider({
  children,
  store,
}: {
  children: ReactNode;
  /** Defaults to the local-browser-storage store. Tests (or a future implementation) can pass one. */
  store?: SavedPracticesStore;
}) {
  const [ownStore] = useState(() => store ?? createLocalSavedPracticesStore());
  const active = store ?? ownStore;

  // Runs only in the browser, after the first render, so server and first client render match.
  useEffect(() => active.connect(), [active]);

  return <SavedPracticesContext.Provider value={active}>{children}</SavedPracticesContext.Provider>;
}

export interface SavedCollectionApi {
  /** Saved slugs in saved order. */
  list: readonly string[];
  has: (slug: string) => boolean;
  /** Returns false (no-op) if the slug is already saved or invalid. */
  add: (slug: string) => boolean;
  /** Returns false if the slug was not saved. */
  remove: (slug: string) => boolean;
}

export interface SavedPractices {
  /** False until saved state has loaded in the browser; avoid showing saved/unsaved before then. */
  hydrated: boolean;
  favorites: SavedCollectionApi;
  routine: SavedCollectionApi;
}

function collectionApi(
  store: SavedPracticesStore,
  collection: SavedCollection,
  list: readonly string[],
): SavedCollectionApi {
  return {
    list,
    has: (slug) => list.includes(slug),
    add: (slug) => store.add(collection, slug),
    remove: (slug) => store.remove(collection, slug),
  };
}

/** Favorites and Routine for UI components. Must be used inside `SavedPracticesProvider`. */
export function useSavedPractices(): SavedPractices {
  const store = useContext(SavedPracticesContext);
  if (!store) throw new Error("useSavedPractices must be used inside SavedPracticesProvider");
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return useMemo(
    () => ({
      hydrated: state.hydrated,
      favorites: collectionApi(store, "favorites", state.favorites),
      routine: collectionApi(store, "routine", state.routine),
    }),
    [store, state],
  );
}
