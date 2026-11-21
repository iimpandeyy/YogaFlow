import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Practice } from "@/lib/content";
import {
  STORAGE_KEY,
  SavedPracticesProvider,
  createLocalSavedPracticesStore,
  findStaleSlugs,
  resolveSavedPractices,
  useSavedPractices,
  type StorageLike,
} from "@/lib/saved";
import { parseStoredValue } from "@/lib/saved/storage-format";

// All storage here is an in-memory fake or jsdom's localStorage. Nothing touches Supabase or the network.

class MemoryStorage implements StorageLike {
  readonly data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

function storeOn(storage: StorageLike | null) {
  return createLocalSavedPracticesStore({ getStorage: () => storage, eventTarget: null });
}

function practice(slug: string): Practice {
  return {
    slug,
    title: slug,
    type: "Yoga",
    difficulty: "Beginner",
    bodyFocus: ["Full Body"],
    summary: "",
    instructions: [],
    benefits: "",
    caution: null,
    image: { path: `/images/practices/${slug}.svg`, alt: "" },
    attribution: { source: null, license: null, imageAttribution: null, isPlaceholder: true },
  };
}

let fetchSpy: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  window.localStorage.clear();
});
afterEach(() => {
  expect(fetchSpy).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

describe("local saved-practices store", () => {
  it("adds, checks, lists, and removes Favorites and Routine items", () => {
    const store = storeOn(new MemoryStorage());
    store.connect();

    expect(store.add("favorites", "mountain-pose")).toBe(true);
    expect(store.add("routine", "box-breathing")).toBe(true);
    expect(store.has("favorites", "mountain-pose")).toBe(true);
    expect(store.has("routine", "mountain-pose")).toBe(false);
    expect(store.list("favorites")).toEqual(["mountain-pose"]);
    expect(store.list("routine")).toEqual(["box-breathing"]);

    expect(store.remove("favorites", "mountain-pose")).toBe(true);
    expect(store.remove("favorites", "mountain-pose")).toBe(false);
    expect(store.list("favorites")).toEqual([]);
    expect(store.list("routine")).toEqual(["box-breathing"]);
  });

  it("persists across a simulated reload", () => {
    const storage = new MemoryStorage();
    const first = storeOn(storage);
    first.connect();
    first.add("favorites", "child-pose");
    first.add("routine", "mountain-pose");
    first.add("routine", "box-breathing");

    const reloaded = storeOn(storage);
    expect(reloaded.getSnapshot().hydrated).toBe(false);
    reloaded.connect();
    expect(reloaded.getSnapshot()).toEqual({
      hydrated: true,
      favorites: ["child-pose"],
      routine: ["mountain-pose", "box-breathing"],
    });
  });

  it("keeps the Routine in the order items were added", () => {
    const store = storeOn(new MemoryStorage());
    store.connect();
    for (const slug of ["c-pose", "a-pose", "b-pose"]) store.add("routine", slug);
    store.remove("routine", "a-pose");
    store.add("routine", "a-pose");
    expect(store.list("routine")).toEqual(["c-pose", "b-pose", "a-pose"]);
  });

  it("treats adding a practice already in the Routine or Favorites as a no-op (D5)", () => {
    const storage = new MemoryStorage();
    const store = storeOn(storage);
    store.connect();
    store.add("routine", "mountain-pose");
    store.add("favorites", "mountain-pose");
    const before = store.getSnapshot();
    const listener = vi.fn();
    store.subscribe(listener);

    expect(store.add("routine", "mountain-pose")).toBe(false);
    expect(store.add("favorites", "mountain-pose")).toBe(false);
    expect(store.list("routine")).toEqual(["mountain-pose"]);
    expect(store.list("favorites")).toEqual(["mountain-pose"]);
    expect(store.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual({
      favorites: ["mountain-pose"],
      routine: ["mountain-pose"],
    });
  });

  it("stores only practice IDs under the versioned key", () => {
    const storage = new MemoryStorage();
    const store = storeOn(storage);
    store.connect();
    store.add("favorites", "child-pose");
    store.add("routine", "box-breathing");

    expect([...storage.data.keys()]).toEqual(["yogaflow:v1"]);
    const saved = JSON.parse(storage.getItem(STORAGE_KEY)!);
    expect(saved).toEqual({ favorites: ["child-pose"], routine: ["box-breathing"] });
    expect(Object.keys(saved).sort()).toEqual(["favorites", "routine"]);
  });

  it("rejects values that are not slug-format IDs", () => {
    const store = storeOn(new MemoryStorage());
    store.connect();
    for (const bad of [
      "",
      "Mountain Pose",
      "jane@example.com",
      "a--b",
      "-a",
      "a/b",
      "x".repeat(201),
    ]) {
      expect(store.add("favorites", bad)).toBe(false);
    }
    expect(store.list("favorites")).toEqual([]);
  });

  it("loads saved data before a change made ahead of hydration, so nothing is overwritten", () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ favorites: ["child-pose"], routine: [] }));
    const store = storeOn(storage);
    store.add("favorites", "mountain-pose");
    expect(store.list("favorites")).toEqual(["child-pose", "mountain-pose"]);
  });

  describe("corrupted or wrongly shaped storage", () => {
    it.each([
      ["invalid JSON", "{not json"],
      ["null", "null"],
      ["a number", "42"],
      ["a string", '"mountain-pose"'],
      ["an array", '["mountain-pose"]'],
      ["fields of the wrong type", '{"favorites":"mountain-pose","routine":{"a":1}}'],
    ])("starts empty when the stored value is %s", (_label, raw) => {
      const storage = new MemoryStorage();
      storage.setItem(STORAGE_KEY, raw);
      const store = storeOn(storage);
      expect(() => store.connect()).not.toThrow();
      expect(store.getSnapshot()).toEqual({ hydrated: true, favorites: [], routine: [] });

      // Still works in memory and repairs the stored value on the next write.
      expect(store.add("routine", "mountain-pose")).toBe(true);
      expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual({
        favorites: [],
        routine: ["mountain-pose"],
      });
    });

    it("drops invalid and duplicate entries but keeps valid ones in order", () => {
      expect(
        parseStoredValue(
          JSON.stringify({
            favorites: ["b-pose", 7, null, "Bad Value", "b-pose", "a-pose", { slug: "x" }],
            routine: "oops",
            name: "Jane",
          }),
        ),
      ).toEqual({ favorites: ["b-pose", "a-pose"], routine: [] });
    });
  });

  describe("unavailable storage", () => {
    it("works in memory when there is no storage", () => {
      const store = storeOn(null);
      store.connect();
      expect(store.getSnapshot().hydrated).toBe(true);
      expect(store.add("favorites", "mountain-pose")).toBe(true);
      expect(store.has("favorites", "mountain-pose")).toBe(true);
    });

    it("works in memory when accessing storage throws", () => {
      const store = createLocalSavedPracticesStore({
        getStorage: () => {
          throw new DOMException("blocked", "SecurityError");
        },
        eventTarget: null,
      });
      expect(() => store.connect()).not.toThrow();
      expect(store.add("routine", "mountain-pose")).toBe(true);
      expect(store.list("routine")).toEqual(["mountain-pose"]);
    });

    it("works in memory when getItem and setItem throw", () => {
      const throwing: StorageLike = {
        getItem: () => {
          throw new DOMException("denied", "SecurityError");
        },
        setItem: () => {
          throw new DOMException("full", "QuotaExceededError");
        },
      };
      const store = storeOn(throwing);
      expect(() => store.connect()).not.toThrow();
      expect(store.getSnapshot()).toEqual({ hydrated: true, favorites: [], routine: [] });
      expect(store.add("favorites", "mountain-pose")).toBe(true);
      expect(store.add("routine", "box-breathing")).toBe(true);
      expect(store.remove("routine", "box-breathing")).toBe(true);
      expect(store.list("favorites")).toEqual(["mountain-pose"]);
    });
  });

  it("picks up changes made in another tab through the storage event", () => {
    const storage = new MemoryStorage();
    const target = new EventTarget();
    const store = createLocalSavedPracticesStore({
      getStorage: () => storage,
      eventTarget: target as unknown as Window,
    });
    const disconnect = store.connect();

    storage.setItem(STORAGE_KEY, JSON.stringify({ favorites: ["child-pose"], routine: [] }));
    target.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    expect(store.list("favorites")).toEqual(["child-pose"]);

    storage.setItem(STORAGE_KEY, JSON.stringify({ favorites: [], routine: [] }));
    target.dispatchEvent(new StorageEvent("storage", { key: "some-other-key" }));
    expect(store.list("favorites")).toEqual(["child-pose"]);

    disconnect();
    target.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    expect(store.list("favorites")).toEqual(["child-pose"]);
  });
});

describe("stale IDs", () => {
  const known = [practice("mountain-pose"), practice("box-breathing"), practice("child-pose")];

  it("resolves saved slugs to known practices in saved order, skipping stale ones", () => {
    const result = resolveSavedPractices(
      ["child-pose", "retired-pose", "mountain-pose", "child-pose"],
      known,
    );
    expect(result.map((p) => p.slug)).toEqual(["child-pose", "mountain-pose"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(resolveSavedPractices(["retired-pose"], known)).toEqual([]);
    expect(resolveSavedPractices([], [])).toEqual([]);
  });

  it("lists stale slugs so a caller with the full content set can prune them", () => {
    expect(findStaleSlugs(["child-pose", "retired-pose"], known)).toEqual(["retired-pose"]);
    const store = storeOn(new MemoryStorage());
    store.connect();
    store.add("favorites", "child-pose");
    store.add("favorites", "retired-pose");
    for (const slug of findStaleSlugs(store.list("favorites"), known)) {
      store.remove("favorites", slug);
    }
    expect(store.list("favorites")).toEqual(["child-pose"]);
  });
});

describe("useSavedPractices with SavedPracticesProvider", () => {
  function Probe() {
    const saved = useSavedPractices();
    return (
      <div>
        <p data-testid="hydrated">{String(saved.hydrated)}</p>
        <p data-testid="favorites">{saved.favorites.list.join(",")}</p>
        <p data-testid="routine">{saved.routine.list.join(",")}</p>
        <p data-testid="has-child">{String(saved.favorites.has("child-pose"))}</p>
        <button onClick={() => saved.routine.add("mountain-pose")}>add</button>
      </div>
    );
  }

  it("renders the empty, not-hydrated state on the server even when data is saved", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ favorites: ["child-pose"], routine: ["mountain-pose"] }),
    );
    const html = renderToString(
      <SavedPracticesProvider>
        <Probe />
      </SavedPracticesProvider>,
    );
    expect(html).toContain('data-testid="hydrated">false<');
    expect(html).toContain('data-testid="has-child">false<');
    expect(html).not.toContain("mountain-pose<");
  });

  it("hydrates from localStorage after mount and persists changes", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ favorites: ["child-pose"], routine: [] }),
    );
    render(
      <SavedPracticesProvider>
        <Probe />
      </SavedPracticesProvider>,
    );
    expect(screen.getByTestId("hydrated")).toHaveTextContent("true");
    expect(screen.getByTestId("favorites")).toHaveTextContent("child-pose");
    expect(screen.getByTestId("has-child")).toHaveTextContent("true");

    act(() => screen.getByRole("button", { name: "add" }).click());
    act(() => screen.getByRole("button", { name: "add" }).click());
    expect(screen.getByTestId("routine").textContent).toBe("mountain-pose");
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual({
      favorites: ["child-pose"],
      routine: ["mountain-pose"],
    });
  });

  it("does not crash when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    render(
      <SavedPracticesProvider>
        <Probe />
      </SavedPracticesProvider>,
    );
    expect(screen.getByTestId("hydrated")).toHaveTextContent("true");
    act(() => screen.getByRole("button", { name: "add" }).click());
    expect(screen.getByTestId("routine")).toHaveTextContent("mountain-pose");
  });

  it("accepts an injected store, so another implementation can replace the local one", () => {
    const store = storeOn(null);
    render(
      <SavedPracticesProvider store={store}>
        <Probe />
      </SavedPracticesProvider>,
    );
    act(() => {
      store.add("favorites", "child-pose");
    });
    expect(screen.getByTestId("has-child")).toHaveTextContent("true");
  });

  it("throws a clear error outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/inside SavedPracticesProvider/);
  });
});
