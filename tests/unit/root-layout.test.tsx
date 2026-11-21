import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RootLayout from "@/app/layout";
import HomePage from "@/app/page";
import * as YogaRoute from "@/app/yoga/[slug]/page";
import { WELLNESS_DISCLAIMER } from "@/components/layout/wellness-copy";
import { getPracticeBySlug, type Practice } from "@/lib/content";
import { mapPracticeRow } from "@/lib/content/mapping";
import { yogaRow } from "../fixtures/practice-rows";

// No network: the data-access layer is mocked.
vi.mock("@/lib/content", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/content")>()),
  getPracticeBySlug: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh: () => {} }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND (test)");
  },
}));

const mockedGet = vi.mocked(getPracticeBySlug);
const yoga = mapPracticeRow(yogaRow) as Practice;

/** Renders the root layout to HTML and parses it, so `<html>` and `<body>` stay intact. */
function renderLayout(children: ReactNode): Document {
  const html = renderToStaticMarkup(<RootLayout>{children}</RootLayout>);
  return new DOMParser().parseFromString(html, "text/html");
}

function footerDisclaimer(doc: Document): string | null | undefined {
  return doc.querySelector('footer [data-slot="wellness-disclaimer"]')?.textContent;
}

beforeEach(() => {
  mockedGet.mockReset();
});

describe("root layout general-wellness disclaimer (#14)", () => {
  it("renders the approved disclaimer in the footer around any page", () => {
    const doc = renderLayout(<p>Any page</p>);
    expect(doc.querySelectorAll("footer")).toHaveLength(1);
    expect(footerDisclaimer(doc)).toBe(WELLNESS_DISCLAIMER);
  });

  it("renders the footer disclaimer on the Home page", () => {
    const doc = renderLayout(<HomePage />);
    expect(footerDisclaimer(doc)).toBe(WELLNESS_DISCLAIMER);
  });

  it("renders the footer disclaimer on a Practice Details page, plus the in-page reinforcement", async () => {
    mockedGet.mockResolvedValue({ ok: true, data: yoga });
    const page = await YogaRoute.default({ params: Promise.resolve({ slug: yoga.slug }) });
    const doc = renderLayout(page);
    expect(footerDisclaimer(doc)).toBe(WELLNESS_DISCLAIMER);
    const inPage = doc.querySelector(
      'main [data-section="safety-caution"] [data-slot="detail-wellness-disclaimer"]',
    );
    expect(inPage?.textContent).toBe(WELLNESS_DISCLAIMER);
  });
});
