import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as BreathworkRoute from "@/app/breathwork/[slug]/page";
import BreathworkLoading from "@/app/breathwork/[slug]/loading";
import BreathworkNotFound from "@/app/breathwork/[slug]/not-found";
import * as MeditationRoute from "@/app/meditation/[slug]/page";
import MeditationNotFound from "@/app/meditation/[slug]/not-found";
import * as YogaRoute from "@/app/yoga/[slug]/page";
import YogaNotFound from "@/app/yoga/[slug]/not-found";
import { getPracticeBySlug, type Practice, type PracticeResult } from "@/lib/content";
import { mapPracticeRow } from "@/lib/content/mapping";
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
  return render(await route.default(props(slug)));
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
    // Slots owned by later Issues stay empty (#14, #16, #17).
    expect(container.querySelector('[data-slot="practice-actions"]')).toBeNull();
    expect(container.querySelector('[data-slot="safety-notice"]')).toBeNull();
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
