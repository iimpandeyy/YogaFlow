import { expect, test, type Page } from "@playwright/test";

// Deterministic without Supabase: with an empty Routine, the Routine page needs no content (#17).

const WIDTHS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

const DISCOVERY = [
  { label: "Browse Yoga", path: "/yoga" },
  { label: "Browse Breathwork", path: "/breathwork" },
  { label: "Browse Meditation", path: "/meditation" },
] as const;

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

for (const viewport of WIDTHS) {
  test.describe(`Routine empty state, ${viewport.name} (${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const dest of DISCOVERY) {
      test(`offers a direct path to discovery via ${dest.label}`, async ({ page }) => {
        await page.goto("/routine");
        await expect(page.getByRole("heading", { level: 1, name: "Routine" })).toBeVisible();
        await expect(
          page.getByRole("heading", { level: 2, name: "Your Routine is empty" }),
        ).toBeVisible();
        await expectNoHorizontalOverflow(page);

        const main = page.getByRole("main");
        for (const link of DISCOVERY) {
          await expect(main.getByRole("link", { name: link.label })).toHaveAttribute(
            "href",
            link.path,
          );
        }
        const target = main.getByRole("link", { name: dest.label });
        await target.focus();
        await expect(target).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(dest.path);
      });
    }
  });
}
