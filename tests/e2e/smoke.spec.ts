import { expect, test, type Page } from "@playwright/test";

const DESTINATIONS = [
  { label: "Home", path: "/", heading: "YogaFlow" },
  { label: "Yoga", path: "/yoga", heading: "Yoga" },
  { label: "Breathwork", path: "/breathwork", heading: "Breathwork" },
  { label: "Meditation", path: "/meditation", heading: "Meditation" },
  { label: "Favorites", path: "/favorites", heading: "Favorites" },
  { label: "Routine", path: "/routine", heading: "Routine" },
] as const;

const WIDTHS = [
  { name: "mobile", width: 375, height: 812, collapsed: true },
  { name: "desktop", width: 1280, height: 800, collapsed: false },
] as const;

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test("home page shows the YogaFlow heading", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("YogaFlow");
  await expect(page.getByRole("heading", { level: 1, name: "YogaFlow" })).toBeVisible();
});

for (const viewport of WIDTHS) {
  test.describe(`${viewport.name} (${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("primary navigation reaches all six destinations without horizontal overflow", async ({
      page,
    }) => {
      await page.goto("/");
      await expectNoHorizontalOverflow(page);

      for (const dest of DESTINATIONS) {
        const nav = page.getByRole("navigation", { name: "Primary" });
        if (viewport.collapsed) {
          const toggle = page.getByRole("button", { name: "Menu" });
          await expect(toggle).toHaveAttribute("aria-expanded", "false");
          await toggle.click();
          await expect(toggle).toHaveAttribute("aria-expanded", "true");
        }
        await nav.getByRole("link", { name: dest.label, exact: true }).click();
        await expect(page).toHaveURL(dest.path);
        await expect(page.getByRole("heading", { level: 1, name: dest.heading })).toBeVisible();
        // The mobile menu closes after navigation, so include hidden links in this query.
        const currentLink = page
          .getByRole("navigation", { name: "Primary", includeHidden: true })
          .getByRole("link", { name: dest.label, exact: true, includeHidden: true });
        await expect(currentLink).toHaveAttribute("aria-current", "page");
        await expectNoHorizontalOverflow(page);
        if (viewport.collapsed) {
          await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute(
            "aria-expanded",
            "false",
          );
        }
      }
    });

    test("unknown routes show the not-found page with a way back to Home", async ({ page }) => {
      const response = await page.goto("/this-page-does-not-exist");
      expect(response?.status()).toBe(404);
      await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.getByRole("link", { name: "Go to Home" }).click();
      await expect(page).toHaveURL("/");
    });
  });
}

test("skip link moves keyboard focus to the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});
