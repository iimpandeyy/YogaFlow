import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as BreathworkRoute from "@/app/breathwork/[slug]/page";
import BreathworkLoading from "@/app/breathwork/[slug]/loading";
import BreathworkNotFound from "@/app/breathwork/[slug]/not-found";
import * as MeditationRoute from "@/app/meditation/[slug]/page";
import MeditationNotFound from "@/app/meditation/[slug]/not-found";
import * as YogaRoute from "@/app/yoga/[slug]/page";
import YogaNotFound from "@/app/yoga/[slug]/not-found";
import { SAFETY_STOP_NOTICE, WELLNESS_DISCLAIMER } from "@/components/layout/wellness-copy";
import { getPracticeBySlug, type Practice, type PracticeResult } from "@/lib/content";
import { mapPracticeRow } from "@/lib/content/mapping";
import { SavedPracticesProvider } from "@/lib/saved";
import type { PracticeRow } from "@/lib/content/types";
import { breathworkRow, yogaRow } from "../fixtures/practice-rows";

// No network: the data-access layer is mocked; only its typed results are exercised.
vi.mock("@/lib/content", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/content")>()),
  getPracticeBySlug: vi.fn(),
}));

const NOT_FOUND = new Error("NEXT_NOT_FOUND (test)");
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw NOT_FOUND;
  },
  useRouter: () => ({ refresh }),
}));

const mockedGet = vi.mocked(getPracticeBySlug);

function toPractice(row: PracticeRow): Practice {
  const practice = mapPracticeRow(row);
  if (!practice) throw new Error(`fixture ${row.slug} does not match the content contract`);
  return practice;
}

const yoga = toPractice(yogaRow);
const breathwork = toPractice(breathworkRow);
const meditation = toPractice({
  ...breathworkRow,
  slug: "test-meditation",
  title: "Test Meditation",
  type: "Meditation",
  caution: "Open your eyes and pause if you feel uncomfortable.",
  image_path: "/images/practices/test-meditation.svg",
  image_alt: "Test meditation image",
});

const ROUTES = {
  Yoga: { route: YogaRoute, href: "/yoga", practice: yoga },
  Breathwork: { route: BreathworkRoute, href: "/breathwork", practice: breathwork },
  Meditation: { route: MeditationRoute, href: "/meditation", practice: meditation },
} as const;

type RouteModule = typeof YogaRoute;

function props(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

/** Renders an async Server Component page by awaiting it, then rendering its result. */
async function renderPage(route: RouteModule, slug: string) {
  // Details pages include the Favorites (#16) and Routine (#17) toggles, which need the
  // saved-practices provider.
  return render(await route.default(props(slug)), { wrapper: SavedPracticesProvider });
}

function resolveWith(result: PracticeResult) {
  mockedGet.mockResolvedValue(result);
}

beforeEach(() => {
  mockedGet.mockReset();
  refresh.mockReset();
});

describe("Practice Details routes", () => {
  it("exports dynamic rendering so pages are not prerendered at build", () => {
    for (const { route } of Object.values(ROUTES)) {
      expect(route.dynamic).toBe("force-dynamic");
    }
  });

  it("renders a Yoga record with every detail section, caution before instructions", async () => {
    resolveWith({ ok: true, data: yoga });
    const { container } = await renderPage(YogaRoute, yoga.slug);

    expect(mockedGet).toHaveBeenCalledWith(yoga.slug);
    expect(screen.getByRole("heading", { level: 1, name: yoga.title })).toBeInTheDocument();
    expect(screen.getByText("Yoga", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("Beginner")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Safety & Caution" })).toBeInTheDocument();
    expect(screen.getByText(yoga.caution as string)).toBeInTheDocument();
    for (const step of yoga.instructions) expect(screen.getByText(step)).toBeInTheDocument();
    expect(screen.getByText(yoga.benefits)).toBeInTheDocument();

    const order = Array.from(container.querySelectorAll("[data-section]")).map((el) =>
      el.getAttribute("data-section"),
    );
    expect(order.indexOf("safety-caution")).toBeLessThan(order.indexOf("instructions"));

    expect(screen.getByRole("link", { name: /Back to Yoga/ })).toHaveAttribute("href", "/yoga");
    // The actions slot holds the Favorites (#16) and Routine (#17) toggles, in that order; the
    // safety notice slot is filled (#14).
    const actions = container.querySelector('[data-slot="practice-actions"]') as HTMLElement;
    expect(actions).not.toBeNull();
    expect(within(actions).getByRole("button", { name: "Save to Favorites" })).toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: "Add to Routine" })).toBeInTheDocument();
    expect(
      within(actions)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Save to Favorites", "Add to Routine"]);
    expect(container.querySelector('[data-slot="safety-notice"]')).toHaveTextContent(
      SAFETY_STOP_NOTICE,
    );
  });

  it("shows the approved stop-on-pain line under the heading, before the practice's caution (#14)", async () => {
    resolveWith({ ok: true, data: yoga });
    const { container } = await renderPage(YogaRoute, yoga.slug);

    const section = screen.getByRole("region", { name: "Safety & Caution" });
    const notice = within(section).getByText(SAFETY_STOP_NOTICE);
    const caution = within(section).getByText(yoga.caution as string);
    const firstStep = screen.getByText(yoga.instructions[0]);
    expect(notice.closest('[data-slot="safety-notice"]')).not.toBeNull();
    expect(notice.compareDocumentPosition(caution) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      caution.compareDocumentPosition(firstStep) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // The heading comes first inside the section, then the notice.
    const heading = within(section).getByRole("heading", { level: 2, name: "Safety & Caution" });
    expect(heading.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Exactly one stop-on-pain line per page.
    expect(container.querySelectorAll('[data-slot="safety-notice"]')).toHaveLength(1);
  });

  it.each([
    ["Yoga", ROUTES.Yoga],
    ["Breathwork", ROUTES.Breathwork],
    ["Meditation", ROUTES.Meditation],
  ] as const)(
    "always renders Safety & Caution before Instructions on %s details, with the in-page disclaimer",
    async (_type, { route, practice }) => {
      resolveWith({ ok: true, data: practice });
      const { container } = await renderPage(route, practice.slug);
      const order = Array.from(container.querySelectorAll("[data-section]")).map((el) =>
        el.getAttribute("data-section"),
      );
      expect(order.slice(0, 3)).toEqual(["header", "safety-caution", "instructions"]);
      const section = screen.getByRole("region", { name: "Safety & Caution" });
      expect(section).toHaveTextContent(SAFETY_STOP_NOTICE);
      expect(within(section).getByText(WELLNESS_DISCLAIMER)).toBeInTheDocument();
    },
  );

  it("still renders Safety & Caution with the stop-on-pain line when caution is null", async () => {
    expect(breathwork.caution).toBeNull();
    resolveWith({ ok: true, data: breathwork });
    const { container } = await renderPage(BreathworkRoute, breathwork.slug);

    const section = screen.getByRole("region", { name: "Safety & Caution" });
    expect(within(section).getByText(SAFETY_STOP_NOTICE)).toBeInTheDocument();
    expect(container.querySelector('[data-slot="practice-caution"]')).toBeNull();
    const instructions = screen.getByRole("region", { name: "Instructions" });
    expect(
      section.compareDocumentPosition(instructions) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it.each([
    ["Breathwork", ROUTES.Breathwork],
    ["Meditation", ROUTES.Meditation],
  ] as const)(
    "renders a %s record with the same layout",
    async (type, { route, href, practice }) => {
      resolveWith({ ok: true, data: practice });
      const { container } = await renderPage(route, practice.slug);

      expect(screen.getByRole("heading", { level: 1, name: practice.title })).toBeInTheDocument();
      expect(screen.getByText(type, { exact: true })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: "Instructions" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: "Benefits" })).toBeInTheDocument();
      // No difficulty applies to these fixtures.
      expect(container).not.toHaveTextContent(/Beginner|Intermediate|Advanced/);
      expect(screen.getByRole("link", { name: new RegExp(`Back to ${type}`) })).toHaveAttribute(
        "href",
        href,
      );
    },
  );

  it("shows caution for a Meditation record when present", async () => {
    resolveWith({ ok: true, data: meditation });
    await renderPage(MeditationRoute, meditation.slug);
    expect(screen.getByText(meditation.caution as string)).toBeInTheDocument();
  });

  it("calls notFound() for an unknown slug", async () => {
    resolveWith({ ok: false, reason: "not-found" });
    await expect(renderPage(YogaRoute, "no-such-practice")).rejects.toBe(NOT_FOUND);
  });

  it.each([
    ["a Yoga practice under /meditation", MeditationRoute, yoga],
    ["a Breathwork practice under /yoga", YogaRoute, breathwork],
    ["a Meditation practice under /breathwork", BreathworkRoute, meditation],
  ] as const)("treats %s as not found", async (_label, route, practice) => {
    resolveWith({ ok: true, data: practice });
    await expect(renderPage(route, practice.slug)).rejects.toBe(NOT_FOUND);
  });

  it("treats a malformed slug as not found without reading content", async () => {
    await expect(renderPage(YogaRoute, "Not A Slug!")).rejects.toBe(NOT_FOUND);
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it.each(["query-failed", "not-configured", "invalid-data"] as const)(
    "shows a failure state with retry and a library link for %s, never the raw message",
    async (kind) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      resolveWith({
        ok: false,
        reason: "error",
        error: { kind, message: "SECRET-DIAGNOSTIC-DETAIL" },
      });
      const { container } = await renderPage(BreathworkRoute, "test-breathing");

      expect(
        screen.getByRole("heading", { level: 1, name: "This practice could not be loaded" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Something went wrong while loading this practice. Please try again.",
      );
      expect(container).not.toHaveTextContent("SECRET-DIAGNOSTIC-DETAIL");
      expect(container).not.toHaveTextContent(kind);
      expect(screen.getByRole("link", { name: "Back to Breathwork" })).toHaveAttribute(
        "href",
        "/breathwork",
      );
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(refresh).toHaveBeenCalledTimes(1);
    },
  );
});

describe("Practice Details metadata", () => {
  it("uses the practice title", async () => {
    resolveWith({ ok: true, data: yoga });
    await expect(YogaRoute.generateMetadata(props(yoga.slug))).resolves.toEqual({
      title: "Test Yoga Pose | YogaFlow",
    });
  });

  it("uses a generic title when not found, including a type mismatch", async () => {
    resolveWith({ ok: true, data: yoga });
    await expect(MeditationRoute.generateMetadata(props(yoga.slug))).resolves.toEqual({
      title: "Practice not found | YogaFlow",
    });
  });

  it("uses a generic title on failure", async () => {
    resolveWith({ ok: false, reason: "error", error: { kind: "query-failed", message: "x" } });
    await expect(BreathworkRoute.generateMetadata(props("test-breathing"))).resolves.toEqual({
      title: "Practice could not be loaded | YogaFlow",
      robots: { index: false },
    });
  });
});

describe("Practice Details not-found and loading states", () => {
  it.each([
    ["Yoga", YogaNotFound, "/yoga"],
    ["Breathwork", BreathworkNotFound, "/breathwork"],
    ["Meditation", MeditationNotFound, "/meditation"],
  ] as const)("%s not-found offers a way back to its library", (type, NotFound, href) => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "Practice not found" })).toBeVisible();
    expect(screen.getByText(`We couldn’t find this ${type} practice.`)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `Back to ${type}` })).toHaveAttribute("href", href);
  });

  it("loading state announces progress", () => {
    render(<BreathworkLoading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading practice");
  });
});
