import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BreathworkLoading from "@/app/breathwork/loading";
import BreathworkPage from "@/app/breathwork/page";
import MeditationLoading from "@/app/meditation/loading";
import MeditationPage from "@/app/meditation/page";
import { listPractices, type ContentErrorKind, type Practice } from "@/lib/content";
import { mapPracticeRow } from "@/lib/content/mapping";
import type { PracticeRow } from "@/lib/content/types";
import {
  breathworkRow,
  meditationRow,
  secondBreathworkRow,
  secondMeditationRow,
} from "../fixtures/practice-rows";

// No network: the data-access layer is mocked; only its typed results are exercised.
vi.mock("@/lib/content", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/content")>()),
  listPractices: vi.fn(),
}));

vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

function toPractice(row: PracticeRow): Practice {
  const practice = mapPracticeRow(row);
  if (!practice) throw new Error(`fixture ${row.slug} does not match the content contract`);
  return practice;
}

const listPracticesMock = vi.mocked(listPractices);

const LIBRARIES = [
  {
    type: "Breathwork",
    Page: BreathworkPage,
    Loading: BreathworkLoading,
    basePath: "/breathwork",
    intro: "Explore beginner-friendly breathing exercises.",
    hint: "Select an exercise to see its steps.",
    // Deliberately not alphabetical: the page must keep the data-access layer's order.
    // One fixture has no difficulty and one has Beginner, to show it appears only when applicable.
    fixtures: [toPractice(breathworkRow), toPractice(secondBreathworkRow)],
  },
  {
    type: "Meditation",
    Page: MeditationPage,
    Loading: MeditationLoading,
    basePath: "/meditation",
    intro: "Read guided meditation practice descriptions.",
    hint: "Select a practice to see its details.",
    fixtures: [toPractice(meditationRow), toPractice(secondMeditationRow)],
  },
] as const;

beforeEach(() => {
  listPracticesMock.mockReset();
  refresh.mockReset();
});

describe.each(LIBRARIES)(
  "$type Library page",
  ({ type, Page, basePath, intro, hint, fixtures }) => {
    it(`lists every ${type} practice in data-layer order, with difficulty only where applicable`, async () => {
      listPracticesMock.mockResolvedValue({ ok: true, data: [...fixtures] });
      render(await Page());

      expect(listPracticesMock).toHaveBeenCalledWith(type);
      expect(screen.getByRole("heading", { level: 1, name: type })).toBeInTheDocument();
      expect(screen.getByText(intro)).toBeInTheDocument();
      expect(screen.getByText(hint)).toBeInTheDocument();

      const cards = screen.getAllByRole("article");
      expect(cards).toHaveLength(fixtures.length);
      fixtures.forEach((practice, index) => {
        const card = cards[index];
        expect(within(card).getByRole("heading", { level: 2, name: practice.title })).toBeVisible();
        expect(within(card).getByText(type, { exact: true })).toBeInTheDocument();
        if (practice.difficulty) {
          expect(within(card).getByText(practice.difficulty, { exact: true })).toBeInTheDocument();
        } else {
          expect(card).not.toHaveTextContent(/Beginner|Intermediate|Advanced/);
        }
      });
    });

    it(`links each card to its ${basePath}/<slug> details route`, async () => {
      listPracticesMock.mockResolvedValue({ ok: true, data: [...fixtures] });
      render(await Page());

      for (const practice of fixtures) {
        expect(screen.getByRole("link", { name: practice.title })).toHaveAttribute(
          "href",
          `${basePath}/${practice.slug}`,
        );
      }
    });

    it("offers no search or filter controls (SDD §6.1)", async () => {
      listPracticesMock.mockResolvedValue({ ok: true, data: [...fixtures] });
      render(await Page());

      expect(screen.queryByRole("searchbox")).toBeNull();
      expect(screen.queryByRole("textbox")).toBeNull();
      expect(screen.queryByRole("combobox")).toBeNull();
      expect(screen.queryByRole("checkbox")).toBeNull();
      expect(screen.queryByRole("radio")).toBeNull();
    });

    it.each<ContentErrorKind>(["query-failed", "not-configured", "invalid-data"])(
      "shows a neutral failure state with Try again and a way Home (%s)",
      async (kind) => {
        listPracticesMock.mockResolvedValue({
          ok: false,
          reason: "error",
          error: { kind, message: "SECRET-DIAGNOSTIC-DETAIL" },
        });
        render(await Page());

        expect(screen.getByRole("heading", { level: 1, name: type })).toBeInTheDocument();
        expect(
          screen.getByRole("heading", { level: 2, name: `${type} practices could not be loaded` }),
        ).toBeInTheDocument();
        expect(screen.getByRole("alert")).toHaveTextContent(
          `Something went wrong while loading ${type} practices. Please try again.`,
        );
        expect(screen.queryByText(hint)).toBeNull();
        expect(screen.queryByText(/SECRET-DIAGNOSTIC-DETAIL/)).toBeNull();
        expect(screen.queryAllByRole("article")).toHaveLength(0);

        fireEvent.click(screen.getByRole("button", { name: "Try again" }));
        expect(refresh).toHaveBeenCalledTimes(1);
        expect(screen.getByRole("link", { name: "Go to Home" })).toHaveAttribute("href", "/");
      },
    );

    it(`shows the empty state when there are no ${type} practices`, async () => {
      listPracticesMock.mockResolvedValue({ ok: true, data: [] });
      const { container } = render(await Page());

      expect(container.querySelector('[data-state="empty"]')).not.toBeNull();
      expect(
        screen.getByRole("heading", { level: 2, name: `No ${type} practices yet` }),
      ).toBeInTheDocument();
      expect(screen.getByText("Please check back later.")).toBeInTheDocument();
      expect(screen.queryByText(hint)).toBeNull();
      expect(screen.queryAllByRole("article")).toHaveLength(0);
    });
  },
);

describe.each(LIBRARIES)("$type Library loading state", ({ type, Loading }) => {
  it("shows the page heading and an announced loading message", () => {
    render(<Loading />);
    expect(screen.getByRole("heading", { level: 1, name: type })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(`Loading ${type} practices`);
  });
});
