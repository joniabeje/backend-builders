import { expect, test } from "@playwright/test";

test.describe("/admin", () => {
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
