import { expect, test, type Page } from "@playwright/test";

/**
 * /reserve is server-rendered, so anything typed before React hydrates is thrown away.
 * Entering the date and times and waiting for the availability hint to report free rooms
 * proves React holds the form state and the existing reservations have loaded. Retry
 * until it does, then fill the rest normally.
 */
async function enterSlot(page: Page, slot: { date: string; start: string; end: string }) {
  await expect(async () => {
    await page.getByLabel("Date *", { exact: true }).fill(slot.date);
    await page.getByLabel("Start *", { exact: true }).fill(slot.start);
    await page.getByLabel("End *", { exact: true }).fill(slot.end);
    await expect(page.getByText(/rooms are free for the selected date and time/)).toBeVisible({
      timeout: 2_000,
    });
  }).toPass({ timeout: 20_000 });
}

test.describe("/reserve", () => {
  test("submits a complete, valid reservation", async ({ page }) => {
    await page.goto("/reserve");
    await expect(page.getByRole("heading", { name: "Reserve an event space" })).toBeVisible();

    // A daytime slot that no seed reservation overlaps.
    await enterSlot(page, { date: "2026-12-01", start: "10:00", end: "11:00" });

    await page.getByLabel("Event Title *").fill("Smoke Test Study Session");
    await page.getByLabel("Organization *").fill("Backend Builders");
    await page.getByLabel("Faculty Advisor *").fill("Dr. Williams");
    await page.getByLabel("Expected Attendance *").fill("20");
    await page.getByLabel("Event Purpose *").fill("End-to-end smoke test of the reservation form.");
    await page.getByRole("combobox").selectOption("seminar-201");

    const submit = page.getByRole("button", { name: "Submit Request" });
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(page.getByRole("heading", { name: "Request submitted!" })).toBeVisible();
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
