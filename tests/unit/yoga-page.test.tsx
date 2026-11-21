import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import YogaLoading from "@/app/yoga/loading";
import YogaPage from "@/app/yoga/page";
import { listPractices, type ContentErrorKind, type Practice } from "@/lib/content";
import { mapPracticeRow } from "@/lib/content/mapping";
import type { PracticeRow } from "@/lib/content/types";
import { secondYogaRow, yogaRow } from "../fixtures/practice-rows";

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

// Deliberately not alphabetical: the page must keep the data-access layer's order.
const YOGA_FIXTURES = [toPractice(yogaRow), toPractice(secondYogaRow)];

const listPracticesMock = vi.mocked(listPractices);

async function renderYogaPage() {
  render(await YogaPage());
}

beforeEach(() => {
  listPracticesMock.mockReset();
  refresh.mockReset();
});

describe("Yoga Library page", () => {
  it("lists every Yoga practice with its title and difficulty, in data-layer order", async () => {
    listPracticesMock.mockResolvedValue({ ok: true, data: YOGA_FIXTURES });
    await renderYogaPage();

    expect(listPracticesMock).toHaveBeenCalledWith("Yoga");
    expect(screen.getByRole("heading", { level: 1, name: "Yoga" })).toBeInTheDocument();

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(YOGA_FIXTURES.length);
    YOGA_FIXTURES.forEach((practice, index) => {
      const card = cards[index];
      // h2 under the page h1: no skipped heading level.
      expect(within(card).getByRole("heading", { level: 2, name: practice.title })).toBeVisible();
      expect(within(card).getByText(practice.difficulty!, { exact: true })).toBeInTheDocument();
    });
  });

  it("links each card to that practice's details route", async () => {
    listPracticesMock.mockResolvedValue({ ok: true, data: YOGA_FIXTURES });
    await renderYogaPage();

    for (const practice of YOGA_FIXTURES) {
      expect(screen.getByRole("link", { name: practice.title })).toHaveAttribute(
        "href",
        `/yoga/${practice.slug}`,
      );
    }
  });

  it.each<ContentErrorKind>(["query-failed", "not-configured", "invalid-data"])(
    "shows a neutral failure state with Try again and a way Home (%s)",
    async (kind) => {
      listPracticesMock.mockResolvedValue({
        ok: false,
        reason: "error",
        error: { kind, message: "SECRET-DIAGNOSTIC-DETAIL" },
      });
      await renderYogaPage();

      expect(screen.getByRole("heading", { level: 1, name: "Yoga" })).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { level: 2, name: "Practices could not be loaded" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Something went wrong while loading practices. Please try again.",
      );
      expect(screen.queryByText(/SECRET-DIAGNOSTIC-DETAIL/)).toBeNull();
      expect(screen.queryAllByRole("article")).toHaveLength(0);

      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("link", { name: "Go to Home" })).toHaveAttribute("href", "/");
    },
  );

  it("shows the empty state when there are no Yoga practices", async () => {
    listPracticesMock.mockResolvedValue({ ok: true, data: [] });
    const { container } = render(await YogaPage());

    expect(container.querySelector('[data-state="empty"]')).not.toBeNull();
    expect(
      screen.getByRole("heading", { level: 2, name: "No Yoga practices yet" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Please check back later.")).toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });
});

describe("Yoga Library loading state", () => {
  it("shows the page heading and an announced loading message", () => {
    render(<YogaLoading />);
    expect(screen.getByRole("heading", { level: 1, name: "Yoga" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading Yoga practices");
  });
});
