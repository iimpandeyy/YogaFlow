import { expect, test } from "@playwright/test";

test("placeholder page shows the YogaFlow heading", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("YogaFlow");
  await expect(page.getByRole("heading", { level: 1, name: "YogaFlow" })).toBeVisible();
});
