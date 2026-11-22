import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as FavoritesRoute from "@/app/favorites/page";
import FavoritesLoading from "@/app/favorites/loading";
import * as BreathworkRoute from "@/app/breathwork/[slug]/page";
import * as MeditationRoute from "@/app/meditation/[slug]/page";
import * as YogaRoute from "@/app/yoga/[slug]/page";
import { FavoritesView } from "@/components/favorites/favorites-view";
import { FavoriteToggle } from "@/components/practice/favorite-toggle";
import {
  getPracticeBySlug,
  listPractices,
  type Practice,
  type PracticeListResult,
  type PracticeType,
} from "@/lib/content";
import { mapPracticeRow } from "@/lib/content/mapping";
import type { PracticeRow } from "@/lib/content/types";
import {
  STORAGE_KEY,
  SavedPracticesProvider,
  createLocalSavedPracticesStore,
  type SavedPracticesStore,
  type StorageLike,
} from "@/lib/saved";
import { breathworkRow, secondYogaRow, yogaRow } from "../fixtures/practice-rows";

// No network: the data-access layer is mocked and saved state lives in an in-memory storage fake.
vi.mock("@/lib/content", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/content")>()),
  getPracticeBySlug: vi.fn(),
  listPractices: vi.fn(),
}));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND (test)");
  },
  useRouter: () => ({ refresh }),
}));

const mockedGet = vi.mocked(getPracticeBySlug);
const mockedList = vi.mocked(listPractices);

class MemoryStorage implements StorageLike {
  readonly data = new Map<string, string>();
  constructor(initial?: { favorites?: string[]; routine?: string[] }) {
    if (initial) {
      this.data.set(
        STORAGE_KEY,
        JSON.stringify({ favorites: initial.favorites ?? [], routine: initial.routine ?? [] }),
      );
    }
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  saved() {
    return JSON.parse(this.data.get(STORAGE_KEY) ?? '{"favorites":[],"routine":[]}') as {
      favorites: string[];
      routine: string[];
    };
  }
}

function toPractice(row: PracticeRow): Practice {
  const practice = mapPracticeRow(row);
  if (!practice) throw new Error(`fixture ${row.slug} does not match the content contract`);
  return practice;
}

const yoga = toPractice(yogaRow);
const secondYoga = toPractice(secondYogaRow);
const breathwork = toPractice(breathworkRow);
const meditation = toPractice({
  ...breathworkRow,
  slug: "test-meditation",
  title: "Test Meditation",
  type: "Meditation",
  image_path: "/images/practices/test-meditation.svg",
});

const BY_TYPE: Record<PracticeType, Practice[]> = {
  Yoga: [secondYoga, yoga],
  Breathwork: [breathwork],
  Meditation: [meditation],
};

let storage: MemoryStorage;
let store: SavedPracticesStore;
let fetchSpy: ReturnType<typeof vi.fn>;

function useStorage(initial?: { favorites?: string[]; routine?: string[] }) {
  storage = new MemoryStorage(initial);
  store = createLocalSavedPracticesStore({ getStorage: () => storage, eventTarget: null });
}

function Wrapper({ children }: { children: ReactNode }) {
  return <SavedPracticesProvider store={store}>{children}</SavedPracticesProvider>;
}

function contentLoads() {
  mockedList.mockImplementation(async (type) => ({ ok: true, data: BY_TYPE[type] }));
}

function contentFails(kind: "query-failed" | "not-configured" | "invalid-data" = "query-failed") {
  mockedList.mockImplementation(async (): Promise<PracticeListResult> => ({
    ok: false,
    reason: "error",
    error: { kind, message: "SECRET-DIAGNOSTIC-DETAIL" },
  }));
}

async function renderFavoritesPage() {
  return render(await FavoritesRoute.default(), { wrapper: Wrapper });
}

beforeEach(() => {
  mockedGet.mockReset();
  mockedList.mockReset();
  refresh.mockReset();
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  useStorage();
});

afterEach(() => {
  expect(fetchSpy).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

describe("Favorite toggle on Practice Details", () => {
  it.each([
    ["Yoga", YogaRoute, yoga],
    ["Breathwork", BreathworkRoute, breathwork],
    ["Meditation", MeditationRoute, meditation],
  ] as const)(
    "saves and removes a %s practice immediately, with an announced confirmation",
    async (_type, route, practice) => {
      mockedGet.mockResolvedValue({ ok: true, data: practice });
      const { container } = render(
        await route.default({ params: Promise.resolve({ slug: practice.slug }) }),
        { wrapper: Wrapper },
      );

      const actions = container.querySelector('[data-slot="practice-actions"]') as HTMLElement;
      expect(actions).not.toBeNull();
      // The Routine toggle (#17) shares the slot, so scope to the Favorites toggle's own status.
      const favoriteToggle = actions.querySelector("[data-favorite-toggle]") as HTMLElement;
      const status = within(favoriteToggle).getByRole("status");
      expect(status).toHaveTextContent("");

      const button = within(actions).getByRole("button", { name: "Save to Favorites" });
      // The label carries the state; aria-pressed is not used alongside a changing label.
      expect(button).not.toHaveAttribute("aria-pressed");
      expect(button).toHaveTextContent("Save to Favorites");
      expect(button).toBeEnabled();

      fireEvent.click(button);
      expect(button).not.toHaveAttribute("aria-pressed");
      expect(button).toHaveTextContent("Saved to Favorites");
      expect(button).toHaveAccessibleName("Saved to Favorites");
      expect(status).toHaveTextContent("Added to Favorites");
      expect(storage.saved().favorites).toEqual([practice.slug]);

      fireEvent.click(button);
      expect(button).not.toHaveAttribute("aria-pressed");
      expect(button).toHaveTextContent("Save to Favorites");
      expect(button).toHaveAccessibleName("Save to Favorites");
      expect(status).toHaveTextContent("Removed from Favorites");
      expect(storage.saved().favorites).toEqual([]);
    },
  );

  it("shows the saved state after a reload from what this browser stored", () => {
    useStorage({ favorites: [yoga.slug] });
    render(<FavoriteToggle slug={yoga.slug} />, { wrapper: Wrapper });
    const button = screen.getByRole("button", { name: "Saved to Favorites" });
    expect(button).toHaveTextContent("Saved to Favorites");
    expect(button).not.toHaveAttribute("aria-pressed");
    // Nothing is announced until the user acts.
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("is a native button, so it is keyboard-focusable and operable", () => {
    render(<FavoriteToggle slug={yoga.slug} />, { wrapper: Wrapper });
    const button = screen.getByRole("button", { name: "Save to Favorites" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
    act(() => button.focus());
    expect(button).toHaveFocus();
  });

  it("shows a neutral, disabled control before saved state has loaded", () => {
    useStorage({ favorites: [yoga.slug] });
    const html = renderToString(
      <Wrapper>
        <FavoriteToggle slug={yoga.slug} />
      </Wrapper>,
    );
    const host = document.createElement("div");
    host.innerHTML = html;
    const button = host.querySelector("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.hasAttribute("aria-pressed")).toBe(false);
    // Not "Favorites", so it cannot be confused with the navigation link; no icon until loaded.
    expect(button.textContent).toBe("Save to Favorites");
    expect(button.querySelector("svg")).toBeNull();
    expect(host.querySelector('[role="status"]')).not.toBeNull();
  });
});

describe("Favorites page", () => {
  it("renders per request and loads every practice type through the data-access layer", async () => {
    expect(FavoritesRoute.dynamic).toBe("force-dynamic");
    contentLoads();
    await renderFavoritesPage();
    expect(mockedList.mock.calls.map(([type]) => type)).toEqual([
      "Yoga",
      "Breathwork",
      "Meditation",
    ]);
    expect(screen.getByRole("heading", { level: 1, name: "Favorites" })).toBeInTheDocument();
  });

  it("lists saved practices of all three types in saved order, skipping stale ones", async () => {
    useStorage({ favorites: [meditation.slug, "removed-practice", yoga.slug, breathwork.slug] });
    contentLoads();
    await renderFavoritesPage();

    const list = screen.getByRole("list", { name: "Saved practices" });
    const titles = within(list)
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    expect(titles).toEqual([meditation.title, yoga.title, breathwork.title]);

    expect(screen.getByRole("link", { name: meditation.title })).toHaveAttribute(
      "href",
      "/meditation/test-meditation",
    );
    expect(screen.getByRole("link", { name: yoga.title })).toHaveAttribute(
      "href",
      "/yoga/test-yoga-pose",
    );
    expect(screen.getByRole("link", { name: breathwork.title })).toHaveAttribute(
      "href",
      "/breathwork/test-breathing",
    );
    expect(screen.queryByText(secondYoga.title)).toBeNull();
    // A stale slug is skipped, not deleted.
    expect(storage.saved().favorites).toContain("removed-practice");
  });

  it("removes an item from the list at once, announces it, and moves focus", async () => {
    useStorage({ favorites: [yoga.slug, breathwork.slug] });
    contentLoads();
    await renderFavoritesPage();

    const remove = screen.getByRole("button", { name: `Remove ${yoga.title} from Favorites` });
    fireEvent.click(remove);

    expect(screen.queryByRole("link", { name: yoga.title })).toBeNull();
    expect(screen.getByRole("link", { name: breathwork.title })).toBeInTheDocument();
    expect(storage.saved().favorites).toEqual([breathwork.slug]);
    expect(screen.getByRole("status")).toHaveTextContent(`Removed ${yoga.title} from Favorites`);
    expect(
      screen.getByRole("button", { name: `Remove ${breathwork.title} from Favorites` }),
    ).toHaveFocus();

    fireEvent.click(
      screen.getByRole("button", { name: `Remove ${breathwork.title} from Favorites` }),
    );
    expect(storage.saved().favorites).toEqual([]);
    expect(screen.getByRole("heading", { level: 2, name: "No Favorites yet" })).toBeVisible();
    const emptyHeading = screen.getByRole("heading", { level: 2, name: "No Favorites yet" });
    expect(emptyHeading).toHaveAttribute("tabindex", "-1");
    expect(emptyHeading).toHaveFocus();
  });

  it("shows an empty state that explains Favorites and links to discovery", async () => {
    contentLoads();
    await renderFavoritesPage();

    expect(screen.getByRole("heading", { level: 2, name: "No Favorites yet" })).toBeVisible();
    expect(
      screen.getByText(
        "Save a practice from its details page to find it here. Favorites are kept in this browser only.",
      ),
    ).toBeInTheDocument();
    for (const [label, href] of [
      ["Browse Yoga", "/yoga"],
      ["Browse Breathwork", "/breathwork"],
      ["Browse Meditation", "/meditation"],
    ]) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
    }
  });

  it("shows the empty state when every saved slug is stale, without deleting them", async () => {
    useStorage({ favorites: ["removed-practice"] });
    contentLoads();
    await renderFavoritesPage();
    expect(screen.getByRole("heading", { level: 2, name: "No Favorites yet" })).toBeVisible();
    expect(storage.saved().favorites).toEqual(["removed-practice"]);
  });

  it.each(["query-failed", "not-configured", "invalid-data"] as const)(
    "shows a failure state for %s and keeps every saved item",
    async (kind) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      useStorage({ favorites: [yoga.slug, "removed-practice"] });
      contentFails(kind);
      const { container } = await renderFavoritesPage();

      expect(
        screen.getByRole("heading", { level: 2, name: "Your Favorites could not be loaded" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Something went wrong while loading your Favorites. Please try again. Your saved practices are kept.",
      );
      expect(container).not.toHaveTextContent("SECRET-DIAGNOSTIC-DETAIL");
      expect(container).not.toHaveTextContent(kind);
      expect(screen.queryByText("No Favorites yet")).toBeNull();
      expect(storage.saved().favorites).toEqual([yoga.slug, "removed-practice"]);

      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(refresh).toHaveBeenCalledTimes(1);
    },
  );

  it("still shows the empty state when nothing is saved and content failed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    contentFails();
    await renderFavoritesPage();
    expect(screen.getByRole("heading", { level: 2, name: "No Favorites yet" })).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a loading state, not the empty state, before saved state has loaded", () => {
    const html = renderToString(
      <Wrapper>
        <FavoritesView content={{ ok: true, practices: [] }} />
      </Wrapper>,
    );
    expect(html).toContain("Loading your Favorites");
    expect(html).not.toContain("No Favorites yet");
  });

  it("route loading state keeps the page heading and announces progress", () => {
    render(<FavoritesLoading />);
    expect(screen.getByRole("heading", { level: 1, name: "Favorites" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading your Favorites");
  });

  it("removal from the details page is reflected on the Favorites page", async () => {
    useStorage({ favorites: [yoga.slug] });
    contentLoads();
    const { unmount } = render(<FavoriteToggle slug={yoga.slug} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole("button", { name: "Saved to Favorites" }));
    unmount();

    await renderFavoritesPage();
    expect(screen.getByRole("heading", { level: 2, name: "No Favorites yet" })).toBeVisible();
  });
});
