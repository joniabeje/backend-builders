import { expect, test } from "@playwright/test";
import { enterSlot, submitRequest } from "./helpers/submit-request";

// Playwright sets VITE_USE_MOCKS=true, so the in-memory seed is used. Move between pages
// with in-app links; a full reload starts a fresh store. Persistence across reload is
// covered manually against the emulator (docs/ARCHITECTURE.md).
test.describe("/reserve", () => {
  test("saves a valid request, shows its id, and lists it for requester and admin", async ({
    page,
  }) => {
    // A daytime slot that no seed reservation overlaps.
    await submitRequest(page, {
      title: "Smoke Test Study Session",
      attendance: "20",
      room: "seminar-201",
      slot: { date: "2026-12-01", start: "10:00", end: "11:00" },
    });
    // The seed requests go up to REQ-1042.
    await expect(page.getByText("REQ-1043")).toBeVisible();

    await page.getByRole("link", { name: "View My Requests" }).click();
    await expect(page.getByRole("heading", { name: "Smoke Test Study Session" })).toBeVisible();

    await page.getByRole("link", { name: "Admin", exact: true }).click();
    const row = page.getByRole("row").filter({ hasText: "Smoke Test Study Session" });
    await expect(row).toContainText("Unverified requester");
    await expect(row).toContainText("Pending");
    await expect(row).toContainText("low");
  });

  test("scores a submitted high-risk request and flags it for review", async ({ page }) => {
    // 150 attendees (2 points) + after-hours (1) + food (1) = 4, which is high (#5).
    await submitRequest(page, {
      title: "Evening Gala",
      attendance: "150",
      room: "lkd-aud",
      slot: { date: "2026-12-02", start: "18:00", end: "21:00" },
      food: true,
    });

    await page.getByRole("link", { name: "Admin", exact: true }).click();
    const row = page.getByRole("row").filter({ hasText: "Evening Gala" });
    await expect(row).toContainText("high");
    await expect(row).toContainText("Requires additional review");
  });

  test("explains a bad advisor email and missing approval inline", async ({ page }) => {
    await page.goto("/reserve");
    await enterSlot(page, { date: "2026-12-03", start: "10:00", end: "11:00" });

    await page.getByLabel("Event Title *").fill("Advisor Check");
    await page.getByLabel("Organization *").fill("Backend Builders");
    await page.getByLabel("Faculty Advisor *").fill("Dr. Williams");
    await page.getByLabel("Advisor Email *").fill("williams");
    await page.getByLabel("Expected Attendance *").fill("20");
    await page.getByLabel("Event Purpose *").fill("Checks the advisor rules.");
    await page.getByRole("combobox").selectOption("seminar-201");

    const submit = page.getByRole("button", { name: "Submit Request" });
    const emailHint = "Enter the advisor's email address, like name@howard.edu.";
    const approvalHint = "Confirm that your faculty advisor has approved this event.";
    // Each message appears inline under its field and again in the validation panel.
    await expect(page.getByText(emailHint)).toHaveCount(2);
    await expect(page.getByText(approvalHint)).toHaveCount(2);
    await expect(submit).toBeDisabled();

    await page.getByLabel("Advisor Email *").fill("williams@howard.edu");
    await expect(page.getByText(emailHint)).toHaveCount(0);
    await expect(submit).toBeDisabled();

    await page.getByLabel("My faculty advisor has approved this event *").check();
    await expect(page.getByText(approvalHint)).toHaveCount(0);
    await expect(submit).toBeEnabled();
  });

  test("blocks submission when attendance exceeds the room's capacity", async ({ page }) => {
    await page.goto("/reserve");
    await enterSlot(page, { date: "2026-12-01", start: "10:00", end: "11:00" });

    await page.getByLabel("Expected Attendance *").fill("40");
    await page.getByRole("combobox").selectOption("seminar-201");

    await expect(page.getByText(/exceeds Seminar Room 201 capacity of 25/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit Request" })).toBeDisabled();
  });
});
