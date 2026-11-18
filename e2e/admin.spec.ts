import { expect, test } from "@playwright/test";

test.describe("/admin", () => {
  // Playwright sets VITE_USE_MOCKS=true, so the /admin guard and mock sign-in use the
  // demo admin without hitting Firestore (#61, #90).
  test("signs in as admin and lists at least one request", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    // SSR already fills the email defaults; wait for client chrome (Admin link from
    // useCurrentUser) so the form's onSubmit handler is attached before we click.
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Admin", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Email").fill("admin@cea.howard.edu");
    await page.getByLabel("Password").fill("admin-demo");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });

  test("lists requests with their stored risk and flags those needing review", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();

    // Seed request REQ-1041: 240 attendees, external guests, 17:00–21:00, food (#5).
    const showcase = page.getByRole("row").filter({ hasText: "Architecture Senior Showcase" });
    await expect(showcase).toContainText("high");
    await expect(showcase).toContainText("Requires additional review");
    await expect(showcase).toContainText("Large attendance (150+)");

    // Seed request REQ-1040: 28 attendees, 14:00–16:00, no risk factors.
    const workshop = page.getByRole("row").filter({ hasText: "Robotics Club Workshop" });
    await expect(workshop).toContainText("low");
    await expect(workshop).not.toContainText("Requires additional review");
  });
});
