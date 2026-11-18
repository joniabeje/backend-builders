// HTTP coverage for POST /api/reservations conflict paths (#67).
import { beforeEach, describe, it } from "vitest";
import assert from "node:assert/strict";
import type { NewReservation } from "@/domain/reservation";
import { getDb } from "./firestore.server";
import { handleCreateReservation } from "./reservations-http.server";
import { seedDatabase } from "./seed.server";
import { clearEmulator } from "./testing/emulator";

const VALID: NewReservation = {
  title: "Conflict HTTP Check",
  organization: "CEA Student Council",
  advisor: "Dr. Okafor",
  advisorEmail: "okafor@howard.edu",
  advisorApproved: true,
  purpose: "Assert 409 and back-to-back over HTTP.",
  date: "2026-08-01",
  startTime: "14:00",
  endTime: "15:00",
  attendance: 12,
  room: "seminar-201",
  hasFood: false,
  externalGuests: false,
  itNeeds: false,
};

function createRequest(body: NewReservation): Request {
  return new Request("http://localhost/api/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/reservations conflicts (#67)", () => {
  beforeEach(async () => {
    await clearEmulator();
    await seedDatabase(getDb(), { reservations: [] });
  });

  it("returns 409 with conflicting ids for an overlapping booking", async () => {
    const first = await handleCreateReservation(createRequest(VALID));
    assert.equal(first.status, 201);
    const created = (await first.json()) as { id: string };

    const overlap = await handleCreateReservation(
      createRequest({
        ...VALID,
        title: "Overlap",
        startTime: "14:30",
        endTime: "15:30",
      }),
    );
    assert.equal(overlap.status, 409);
    const body = (await overlap.json()) as { conflicts: { id: string }[] };
    assert.deepEqual(
      body.conflicts.map((conflict) => conflict.id),
      [created.id],
    );
  });

  it("allows a booking that starts exactly when another ends", async () => {
    assert.equal((await handleCreateReservation(createRequest(VALID))).status, 201);

    const backToBack = await handleCreateReservation(
      createRequest({
        ...VALID,
        title: "Back to back",
        startTime: "15:00",
        endTime: "16:00",
      }),
    );
    assert.equal(backToBack.status, 201);
    const body = (await backToBack.json()) as { startTime: string; endTime: string };
    assert.equal(body.startTime, "15:00");
    assert.equal(body.endTime, "16:00");
  });
});
