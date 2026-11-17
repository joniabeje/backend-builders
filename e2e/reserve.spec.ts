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

type Request = {
  title: string;
  attendance: string;
  room: string;
  slot: { date: string; start: string; end: string };
  food?: boolean;
};

async function submitRequest(page: Page, request: Request) {
  await page.goto("/reserve");
  await expect(page.getByRole("heading", { name: "Reserve an event space" })).toBeVisible();
  await enterSlot(page, request.slot);

  await page.getByLabel("Event Title *").fill(request.title);
  await page.getByLabel("Organization *").fill("Backend Builders");
  await page.getByLabel("Faculty Advisor *").fill("Dr. Williams");
  await page.getByLabel("Expected Attendance *").fill(request.attendance);
  await page.getByLabel("Event Purpose *").fill("End-to-end test of the reservation form.");
  await page.getByRole("combobox").selectOption(request.room);
  if (request.food) await page.getByRole("button", { name: "Food / catering" }).click();

  const submit = page.getByRole("button", { name: "Submit Request" });
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByRole("heading", { name: "Request submitted!" })).toBeVisible();
}

// The in-memory repository lives for the browser session, so these tests move between
// pages with in-app links. A full reload starts a fresh store until the API exists (#13).
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

  test("blocks submission when attendance exceeds the room's capacity", async ({ page }) => {
    await page.goto("/reserve");
    await enterSlot(page, { date: "2026-12-01", start: "10:00", end: "11:00" });

    await page.getByLabel("Expected Attendance *").fill("40");
    await page.getByRole("combobox").selectOption("seminar-201");

    await expect(page.getByText(/exceeds Seminar Room 201 capacity of 25/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit Request" })).toBeDisabled();
  });
});
