import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as RoutineRoute from "@/app/routine/page";
import RoutineLoading from "@/app/routine/loading";
import * as BreathworkRoute from "@/app/breathwork/[slug]/page";
import * as MeditationRoute from "@/app/meditation/[slug]/page";
import * as YogaRoute from "@/app/yoga/[slug]/page";
import { RoutineToggle } from "@/components/practice/routine-toggle";
import { RoutineView, routineCountLabel } from "@/components/routine/routine-view";
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

/** A new store over the same storage: what a page reload sees. */
function reload() {
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

async function renderRoutinePage() {
  return render(await RoutineRoute.default(), { wrapper: Wrapper });
}

function routineTitles() {
  const list = screen.getByRole("list", { name: "Practices in your Routine" });
  return within(list)
    .getAllByRole("heading", { level: 2 })
    .map((heading) => heading.textContent);
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

describe("Routine toggle on Practice Details", () => {
  it.each([
    ["Yoga", YogaRoute, yoga],
    ["Breathwork", BreathworkRoute, breathwork],
    ["Meditation", MeditationRoute, meditation],
  ] as const)(
    "adds and removes a %s practice immediately, with an announced confirmation",
    async (_type, route, practice) => {
      mockedGet.mockResolvedValue({ ok: true, data: practice });
      const { container } = render(
        await route.default({ params: Promise.resolve({ slug: practice.slug }) }),
        { wrapper: Wrapper },
      );

      const actions = container.querySelector('[data-slot="practice-actions"]') as HTMLElement;
      const toggle = actions.querySelector("[data-routine-toggle]") as HTMLElement;
      expect(toggle).not.toBeNull();
      const status = within(toggle).getByRole("status");
      expect(status).toHaveTextContent("");

      const button = within(actions).getByRole("button", { name: "Add to Routine" });
      expect(button).not.toHaveAttribute("aria-pressed");
      expect(button).toBeEnabled();
      expect(button.querySelector("svg")).not.toBeNull();

      fireEvent.click(button);
      expect(button).toHaveTextContent("Added to Routine");
      expect(button).toHaveAccessibleName("Added to Routine");
      expect(button).not.toHaveAttribute("aria-pressed");
      expect(status).toHaveTextContent("Added to Routine");
      expect(storage.saved().routine).toEqual([practice.slug]);

      fireEvent.click(button);
      expect(button).toHaveAccessibleName("Add to Routine");
      expect(status).toHaveTextContent("Removed from Routine");
      expect(storage.saved().routine).toEqual([]);
      // Favorites are untouched by the Routine control.
      expect(storage.saved().favorites).toEqual([]);
    },
  );

  it("shows the added state, not a second add, when the practice is already in the Routine (D5)", () => {
    useStorage({ routine: [yoga.slug] });
    render(<RoutineToggle slug={yoga.slug} />, { wrapper: Wrapper });
    expect(screen.queryByRole("button", { name: "Add to Routine" })).toBeNull();
    const button = screen.getByRole("button", { name: "Added to Routine" });
    expect(button).toHaveTextContent("Added to Routine");
    // Nothing is announced until the user acts.
    expect(screen.getByRole("status")).toHaveTextContent("");
    // The store also refuses a duplicate add, so the Routine holds the practice once.
    expect(store.add("routine", yoga.slug)).toBe(false);
    expect(storage.saved().routine).toEqual([yoga.slug]);
  });

  it("uses a different icon for the added state, so it is not shown by color alone", () => {
    render(<RoutineToggle slug={yoga.slug} />, { wrapper: Wrapper });
    const button = screen.getByRole("button", { name: "Add to Routine" });
    const before = button.querySelector("svg")?.innerHTML;
    fireEvent.click(button);
    const after = button.querySelector("svg")?.innerHTML;
    expect(before).toBeTruthy();
    expect(after).toBeTruthy();
    expect(after).not.toBe(before);
  });

  it("is a native button, so it is keyboard-focusable and operable", () => {
    render(<RoutineToggle slug={yoga.slug} />, { wrapper: Wrapper });
    const button = screen.getByRole("button", { name: "Add to Routine" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
    act(() => button.focus());
    expect(button).toHaveFocus();
  });

  it("shows a neutral, disabled control before saved state has loaded", () => {
    useStorage({ routine: [yoga.slug] });
    const html = renderToString(
      <Wrapper>
        <RoutineToggle slug={yoga.slug} />
      </Wrapper>,
    );
    const host = document.createElement("div");
    host.innerHTML = html;
    const button = host.querySelector("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.hasAttribute("aria-pressed")).toBe(false);
    expect(button.textContent).toBe("Add to Routine");
    expect(button.querySelector("svg")).toBeNull();
    expect(host.querySelector('[role="status"]')).not.toBeNull();
  });
});

describe("Routine page", () => {
  it("renders per request and loads every practice type through the data-access layer", async () => {
    expect(RoutineRoute.dynamic).toBe("force-dynamic");
    contentLoads();
    await renderRoutinePage();
    expect(mockedList.mock.calls.map(([type]) => type)).toEqual([
      "Yoga",
      "Breathwork",
      "Meditation",
    ]);
    expect(screen.getByRole("heading", { level: 1, name: "Routine" })).toBeInTheDocument();
  });

  it("collects at least three mixed-type practices added from details, in the order added", async () => {
    contentLoads();
    for (const practice of [breathwork, yoga, meditation]) {
      const { unmount } = render(<RoutineToggle slug={practice.slug} />, { wrapper: Wrapper });
      fireEvent.click(screen.getByRole("button", { name: "Add to Routine" }));
      unmount();
    }
    expect(storage.saved().routine).toEqual([breathwork.slug, yoga.slug, meditation.slug]);

    const { container } = await renderRoutinePage();
    expect(routineTitles()).toEqual([breathwork.title, yoga.title, meditation.title]);
    expect(container.querySelector("[data-routine-count]")).toHaveTextContent("3 practices");
    expect(screen.getByText("3 practices")).toBeVisible();

    const list = screen.getByRole("list", { name: "Practices in your Routine" });
    expect(list.tagName).toBe("OL");
    const items = within(list).getAllByRole("listitem");
    // Title, type, and difficulty when applicable.
    expect(items[0]).toHaveTextContent("Breathwork");
    expect(items[1]).toHaveTextContent("Yoga");
    expect(items[1]).toHaveTextContent(yoga.difficulty as string);
    expect(items[2]).toHaveTextContent("Meditation");
    expect(items[0]).not.toHaveTextContent(/Beginner|Intermediate|Advanced/);

    expect(screen.getByRole("link", { name: breathwork.title })).toHaveAttribute(
      "href",
      "/breathwork/test-breathing",
    );
    expect(screen.getByRole("link", { name: yoga.title })).toHaveAttribute(
      "href",
      "/yoga/test-yoga-pose",
    );
    expect(screen.getByRole("link", { name: meditation.title })).toHaveAttribute(
      "href",
      "/meditation/test-meditation",
    );
    expect(screen.queryByText(secondYoga.title)).toBeNull();
  });

  it("removes an item, updates the list and count, announces it, moves focus, and persists", async () => {
    useStorage({ routine: [yoga.slug, meditation.slug, breathwork.slug] });
    contentLoads();
    const first = await renderRoutinePage();
    const status = screen.getAllByRole("status").find((el) => el.closest("[data-routine-view]"));
    expect(screen.getByText("3 practices")).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: `Remove ${meditation.title} from Routine` }),
    );
    expect(routineTitles()).toEqual([yoga.title, breathwork.title]);
    expect(screen.getByText("2 practices")).toBeVisible();
    expect(status).toHaveTextContent(
      `Removed ${meditation.title} from Routine. 2 practices in your Routine.`,
    );
    expect(
      screen.getByRole("button", { name: `Remove ${breathwork.title} from Routine` }),
    ).toHaveFocus();
    expect(storage.saved().routine).toEqual([yoga.slug, breathwork.slug]);

    fireEvent.click(
      screen.getByRole("button", { name: `Remove ${breathwork.title} from Routine` }),
    );
    expect(screen.getByText("1 practice")).toBeVisible();
    expect(status).toHaveTextContent(
      `Removed ${breathwork.title} from Routine. 1 practice in your Routine.`,
    );
    expect(screen.getByRole("button", { name: `Remove ${yoga.title} from Routine` })).toHaveFocus();

    // Reload: the remaining item is still there.
    first.unmount();
    reload();
    await renderRoutinePage();
    expect(routineTitles()).toEqual([yoga.title]);
    expect(screen.getByText("1 practice")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: `Remove ${yoga.title} from Routine` }));
    expect(storage.saved().routine).toEqual([]);
    const emptyHeading = screen.getByRole("heading", { level: 2, name: "Your Routine is empty" });
    expect(emptyHeading).toHaveAttribute("tabindex", "-1");
    expect(emptyHeading).toHaveFocus();
    expect(
      screen.getAllByRole("status").find((el) => el.closest("[data-routine-view]")),
    ).toHaveTextContent(`Removed ${yoga.title} from Routine. Your Routine is empty.`);
  });

  it("shows an empty state that explains Routine and links to discovery", async () => {
    contentLoads();
    await renderRoutinePage();

    expect(screen.getByRole("heading", { level: 2, name: "Your Routine is empty" })).toBeVisible();
    expect(
      screen.getByText(
        "Add practices from their details pages to collect them here, in the order you add them. Your Routine is kept in this browser only.",
      ),
    ).toBeInTheDocument();
    for (const [label, href] of [
      ["Browse Yoga", "/yoga"],
      ["Browse Breathwork", "/breathwork"],
      ["Browse Meditation", "/meditation"],
    ]) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
    }
    expect(screen.queryByText(/\d+ practices?$/)).toBeNull();
  });

  it("skips stale slugs without counting or deleting them", async () => {
    useStorage({ routine: ["removed-practice", yoga.slug] });
    contentLoads();
    await renderRoutinePage();
    expect(routineTitles()).toEqual([yoga.title]);
    expect(screen.getByText("1 practice")).toBeVisible();
    expect(storage.saved().routine).toEqual(["removed-practice", yoga.slug]);
  });

  it("shows the empty state when every Routine slug is stale, without deleting them", async () => {
    useStorage({ routine: ["removed-practice"] });
    contentLoads();
    await renderRoutinePage();
    expect(screen.getByRole("heading", { level: 2, name: "Your Routine is empty" })).toBeVisible();
    expect(storage.saved().routine).toEqual(["removed-practice"]);
  });

  it.each(["query-failed", "not-configured", "invalid-data"] as const)(
    "shows a failure state for %s and keeps every Routine item",
    async (kind) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      useStorage({ routine: [yoga.slug, "removed-practice"] });
      contentFails(kind);
      const { container } = await renderRoutinePage();

      expect(
        screen.getByRole("heading", { level: 2, name: "Your Routine could not be loaded" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Something went wrong while loading your Routine. Please try again. The practices in your Routine are kept.",
      );
      expect(container).not.toHaveTextContent("SECRET-DIAGNOSTIC-DETAIL");
      expect(container).not.toHaveTextContent(kind);
      expect(screen.queryByText("Your Routine is empty")).toBeNull();
      expect(storage.saved().routine).toEqual([yoga.slug, "removed-practice"]);

      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(refresh).toHaveBeenCalledTimes(1);
    },
  );

  it("still shows the empty state when the Routine is empty and content failed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    contentFails();
    await renderRoutinePage();
    expect(screen.getByRole("heading", { level: 2, name: "Your Routine is empty" })).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a loading state, not the empty state, before saved state has loaded", () => {
    const html = renderToString(
      <Wrapper>
        <RoutineView content={{ ok: true, practices: [] }} />
      </Wrapper>,
    );
    expect(html).toContain("Loading your Routine");
    expect(html).not.toContain("Your Routine is empty");
  });

  it("route loading state keeps the page heading and announces progress", () => {
    render(<RoutineLoading />);
    expect(screen.getByRole("heading", { level: 1, name: "Routine" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading your Routine");
  });

  it("removal from the details page is reflected on the Routine page", async () => {
    useStorage({ routine: [yoga.slug, breathwork.slug] });
    contentLoads();
    const { unmount } = render(<RoutineToggle slug={yoga.slug} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole("button", { name: "Added to Routine" }));
    unmount();

    await renderRoutinePage();
    expect(routineTitles()).toEqual([breathwork.title]);
  });

  it("formats the count in the singular and plural", () => {
    expect(routineCountLabel(1)).toBe("1 practice");
    expect(routineCountLabel(3)).toBe("3 practices");
  });
});
