import { expect, test } from "@playwright/test";
import { submitRequest } from "./helpers/submit-request";

test.describe("/dashboard", () => {
  // Playwright sets VITE_USE_MOCKS=true: in-memory store + mock admin session (#36, #39).
  test("shows a submitted request as Pending", async ({ page }) => {
    await submitRequest(page, {
      title: "Dashboard Pending Smoke",
      attendance: "18",
      room: "seminar-201",
      slot: { date: "2026-12-04", start: "10:00", end: "11:00" },
    });

    await page.getByRole("link", { name: "View My Requests" }).click();
    await expect(page.getByRole("heading", { name: "My Reservation Requests" })).toBeVisible();

    const card = page.getByRole("article").filter({ hasText: "Dashboard Pending Smoke" });
    await expect(card).toBeVisible();
    await expect(card.getByText("Pending Review", { exact: true })).toBeVisible();
  });
});
