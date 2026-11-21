import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WELLNESS_DISCLAIMER } from "@/components/layout/wellness-copy";
import { PracticeCard } from "@/components/practice/practice-card";
import { PracticeDetailLayout } from "@/components/practice/practice-detail-layout";
import { EmptyState } from "@/components/states/empty-state";
import { LoadingState } from "@/components/states/loading-state";
import { mapPracticeRow } from "@/lib/content/mapping";
import type { Practice, PracticeRow } from "@/lib/content/types";
import { breathworkRow, yogaRow } from "../fixtures/practice-rows";

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
const reviewedYoga = toPractice({ ...yogaRow, slug: "reviewed-pose", is_placeholder: false });
const reviewedNoCredits = toPractice({
  ...breathworkRow,
  slug: "reviewed-no-credits",
  source: null,
  license: null,
  image_attribution: null,
  is_placeholder: false,
});

/** Raw content-model field names must never reach user-visible copy (RC-10). */
const RAW_FIELD_NAMES = /is_placeholder|isPlaceholder|body_focus|image_alt|image_path|slug/;

describe("PracticeCard", () => {
  it.each([
    ["Yoga", yoga],
    ["Breathwork", breathwork],
    ["Meditation", meditation],
  ] as const)("renders a %s practice with title, type, summary, and image", (type, practice) => {
    render(<PracticeCard practice={practice} href={`/details/${practice.slug}`} />);
    const card = screen.getByRole("article");
    expect(within(card).getByRole("heading", { level: 3, name: practice.title })).toBeVisible();
    expect(within(card).getByText(type, { exact: true })).toBeInTheDocument();
    expect(within(card).getByText(practice.summary)).toBeInTheDocument();
    expect(within(card).getByRole("img", { name: practice.image.alt })).toHaveAttribute(
      "src",
      practice.image.path,
    );
    expect(card.textContent).not.toMatch(RAW_FIELD_NAMES);
  });

  it("opens the practice through a single link named by the title, using the given href", () => {
    render(<PracticeCard practice={yoga} href="/somewhere/test-yoga-pose" />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName(yoga.title);
    expect(links[0]).toHaveAttribute("href", "/somewhere/test-yoga-pose");
  });

  it("shows difficulty as text and body focus when they apply", () => {
    render(<PracticeCard practice={yoga} href="/x" />);
    const card = screen.getByRole("article");
    expect(within(card).getByText("Beginner")).toBeInTheDocument();
    expect(card).toHaveTextContent("Difficulty: Beginner");
    expect(card).toHaveTextContent("Body focus: Back, Hips");
  });

  it("omits difficulty and body focus when they do not apply", () => {
    render(<PracticeCard practice={breathwork} href="/x" />);
    const card = screen.getByRole("article");
    expect(card).not.toHaveTextContent(/Difficulty|Beginner|Intermediate|Advanced/);
    expect(card).not.toHaveTextContent("Body focus");
  });

  it("labels placeholder visuals in visible text", () => {
    render(<PracticeCard practice={yoga} href="/x" />);
    expect(screen.getByText("Placeholder")).toBeVisible();
  });

  it("shows no placeholder label for reviewed content", () => {
    render(<PracticeCard practice={reviewedYoga} href="/x" />);
    expect(screen.queryByText("Placeholder")).toBeNull();
  });

  it("supports another heading level for different page outlines", () => {
    render(<PracticeCard practice={yoga} href="/x" headingLevel={2} />);
    expect(screen.getByRole("heading", { level: 2, name: yoga.title })).toBeInTheDocument();
  });
});

function sectionOrder(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("[data-section]")).map(
    (el) => el.getAttribute("data-section") ?? "",
  );
}

/** The detail header (a <header> inside an <article> has no landmark role). */
function detailHeader(): HTMLElement {
  const header = document.querySelector<HTMLElement>('[data-section="header"]');
  if (!header) throw new Error("detail header not rendered");
  return header;
}

describe("PracticeDetailLayout", () => {
  it.each([
    ["Yoga", yoga],
    ["Meditation", meditation],
  ] as const)(
    "renders a %s practice in the fixed order with caution before instructions",
    (_type, practice) => {
      const { container } = render(<PracticeDetailLayout practice={practice} />);
      expect(sectionOrder(container)).toEqual([
        "header",
        "safety-caution",
        "instructions",
        "benefits",
        "attribution",
      ]);
      const headings = screen.getAllByRole("heading").map((h) => h.textContent);
      expect(headings).toEqual([
        practice.title,
        "Safety & Caution",
        "Instructions",
        "Benefits",
        "Source & attribution",
      ]);
      // Document order check: the caution text precedes the first instruction step.
      const caution = screen.getByText(practice.caution!);
      const firstStep = screen.getByText(practice.instructions[0]);
      expect(
        caution.compareDocumentPosition(firstStep) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    },
  );

  it("shows the header with title, type, difficulty, body focus, summary, and image", () => {
    render(<PracticeDetailLayout practice={yoga} />);
    expect(screen.getByRole("heading", { level: 1, name: yoga.title })).toBeInTheDocument();
    const header = detailHeader();
    expect(header).toHaveTextContent("Yoga");
    expect(header).toHaveTextContent("Difficulty: Beginner");
    expect(header).toHaveTextContent("Body focus: Back, Hips");
    expect(header).toHaveTextContent(yoga.summary);
    expect(within(header).getByRole("img", { name: yoga.image.alt })).toBeInTheDocument();
  });

  it("lists instructions as ordered steps and shows benefits", () => {
    render(<PracticeDetailLayout practice={yoga} />);
    const steps = within(screen.getByRole("region", { name: "Instructions" })).getAllByRole(
      "listitem",
    );
    expect(steps.map((li) => li.textContent)).toEqual(yoga.instructions);
    expect(screen.getByRole("region", { name: "Benefits" })).toHaveTextContent(yoga.benefits);
  });

  it("omits difficulty, body focus, and the caution section when they do not apply", () => {
    const { container } = render(<PracticeDetailLayout practice={breathwork} />);
    expect(detailHeader()).not.toHaveTextContent(/Difficulty|Body focus/);
    expect(screen.queryByRole("heading", { name: "Safety & Caution" })).toBeNull();
    expect(sectionOrder(container)).toEqual(["header", "instructions", "benefits", "attribution"]);
  });

  it("keeps the Safety & Caution slot before instructions when only a safety notice is given", () => {
    const { container } = render(
      <PracticeDetailLayout practice={breathwork} safetyNotice={<p>Notice from #14</p>} />,
    );
    expect(sectionOrder(container).slice(0, 3)).toEqual([
      "header",
      "safety-caution",
      "instructions",
    ]);
    const slot = container.querySelector('[data-slot="safety-notice"]');
    expect(slot).toHaveTextContent("Notice from #14");
  });

  it("places the safety notice directly under the heading, before the practice's own caution", () => {
    const { container } = render(
      <PracticeDetailLayout practice={yoga} safetyNotice={<p>General notice</p>} />,
    );
    const section = container.querySelector('[data-section="safety-caution"]');
    expect(section).not.toBeNull();
    const slot = section!.querySelector('[data-slot="safety-notice"]');
    const caution = within(section as HTMLElement).getByText(yoga.caution!);
    expect(slot).not.toBeNull();
    expect(slot!.compareDocumentPosition(caution) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("makes Safety & Caution a distinct block with a decorative icon and the disclaimer (#14)", () => {
    render(<PracticeDetailLayout practice={yoga} safetyNotice={<p>General notice</p>} />);
    const section = screen.getByRole("region", { name: "Safety & Caution" });
    // Distinguishable without color: a bordered block, a heading, and a hidden decorative icon.
    expect(section.className).toMatch(/\bborder-2\b/);
    const heading = within(section).getByRole("heading", { level: 2 });
    expect(heading.textContent).toBe("Safety & Caution");
    const icon = heading.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
    // The in-page reinforcement reuses the exact footer disclaimer, after the caution text.
    const disclaimer = within(section).getByText(WELLNESS_DISCLAIMER);
    const caution = within(section).getByText(yoga.caution!);
    expect(
      caution.compareDocumentPosition(disclaimer) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders the actions slot in the header only when actions are given", () => {
    const { container, rerender } = render(<PracticeDetailLayout practice={yoga} />);
    expect(container.querySelector('[data-slot="practice-actions"]')).toBeNull();
    rerender(<PracticeDetailLayout practice={yoga} actions={<button type="button">Act</button>} />);
    const header = detailHeader();
    expect(within(header).getByRole("button", { name: "Act" })).toBeInTheDocument();
  });

  it("labels placeholder content and shows human-readable credits", () => {
    render(<PracticeDetailLayout practice={yoga} />);
    const section = screen.getByRole("region", { name: "Source & attribution" });
    expect(within(section).getByText("Placeholder")).toBeVisible();
    expect(section).toHaveTextContent("Source: Test source");
    expect(section).toHaveTextContent("License: Test license");
    expect(section).toHaveTextContent("Image credit: Test image attribution");
    // The image is labelled as a placeholder too.
    expect(within(detailHeader()).getByText("Placeholder")).toBeVisible();
    expect(document.body.textContent).not.toMatch(RAW_FIELD_NAMES);
  });

  it("shows no placeholder label for reviewed content", () => {
    render(<PracticeDetailLayout practice={reviewedYoga} />);
    expect(screen.queryByText("Placeholder")).toBeNull();
    expect(screen.getByRole("region", { name: "Source & attribution" })).toHaveTextContent(
      "Source: Test source",
    );
  });

  it("omits the attribution section when there is nothing to attribute", () => {
    const { container } = render(<PracticeDetailLayout practice={reviewedNoCredits} />);
    expect(sectionOrder(container)).toEqual(["header", "instructions", "benefits"]);
  });
});

describe("EmptyState", () => {
  it("renders the title, message, and an optional path back", () => {
    render(
      <EmptyState
        title="Nothing here yet"
        message="Try another filter."
        action={{ href: "/yoga", label: "Browse Yoga" }}
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Nothing here yet" })).toBeVisible();
    expect(screen.getByText("Try another filter.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Browse Yoga" })).toHaveAttribute("href", "/yoga");
  });

  it("renders without a message or action, at another heading level", () => {
    render(<EmptyState title="No practices" headingLevel={3} />);
    expect(screen.getByRole("heading", { level: 3, name: "No practices" })).toBeVisible();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("LoadingState", () => {
  it("announces visible loading text in a status region", () => {
    render(<LoadingState label="Loading practices" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading practices");
    expect(screen.getByText("Loading practices")).toBeVisible();
  });

  it("renders decorative placeholder outlines hidden from assistive technology", () => {
    const { container } = render(<LoadingState label="Loading" placeholderCount={2} />);
    const list = container.querySelector('ul[aria-hidden="true"]');
    expect(list?.children).toHaveLength(2);
    expect(screen.queryByRole("list")).toBeNull();
  });
});
