import { expect, test } from "@playwright/test";

test.describe("/admin/analytics", () => {
  // Under VITE_USE_MOCKS, fetchCurrentUser is always the demo admin (same as /admin #90),
  // so role gating is covered by site-nav unit tests + API 403 integration tests.
  test("admin can open analytics charts", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Admin", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Email").fill("admin@cea.howard.edu");
    await page.getByLabel("Password").fill("admin-demo");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();

    await page.goto("/admin/analytics");
    await expect(page.getByRole("heading", { name: "Analytics", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Requests by status" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Room usage" })).toBeVisible();
    await expect(page.locator("[data-chart]").first()).toBeVisible();
  });
});
