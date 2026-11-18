import { expect, type Page } from "@playwright/test";

/**
 * /reserve is server-rendered, so anything typed before React hydrates is thrown away.
 * Entering the date and times and waiting for the availability hint to report free rooms
 * proves React holds the form state and the existing reservations have loaded.
 */
export async function enterSlot(page: Page, slot: { date: string; start: string; end: string }) {
  await expect(async () => {
    await page.getByLabel("Date *", { exact: true }).fill(slot.date);
    await page.getByLabel("Start *", { exact: true }).fill(slot.start);
    await page.getByLabel("End *", { exact: true }).fill(slot.end);
    await expect(page.getByText(/rooms are free for the selected date and time/)).toBeVisible({
      timeout: 2_000,
    });
  }).toPass({ timeout: 20_000 });
}

export type SubmitRequestInput = {
  title: string;
  attendance: string;
  room: string;
  slot: { date: string; start: string; end: string };
  food?: boolean;
};

export async function submitRequest(page: Page, request: SubmitRequestInput) {
  await page.goto("/reserve");
  await expect(page.getByRole("heading", { name: "Reserve an event space" })).toBeVisible();
  await enterSlot(page, request.slot);

  await page.getByLabel("Event Title *").fill(request.title);
  await page.getByLabel("Organization *").fill("Backend Builders");
  await page.getByLabel("Faculty Advisor *").fill("Dr. Williams");
  await page.getByLabel("Advisor Email *").fill("williams@howard.edu");
  await page.getByLabel("Expected Attendance *").fill(request.attendance);
  await page.getByLabel("Event Purpose *").fill("End-to-end test of the reservation form.");
  await page.getByLabel("My faculty advisor has approved this event *").check();
  await page.getByRole("combobox").selectOption(request.room);
  if (request.food) await page.getByRole("button", { name: "Food / catering" }).click();

  const submit = page.getByRole("button", { name: "Submit Request" });
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByRole("heading", { name: "Request submitted!" })).toBeVisible();
}
