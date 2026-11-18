// GET /api/reservations?from=&to= lists every status in an event-date range (#50).
import { beforeEach, describe, it } from "vitest";
import assert from "node:assert/strict";
import type { EventRequest, NewReservation } from "@/domain/reservation";
import { getDb } from "./firestore.server";
import { handleListReservations } from "./reservations-http.server";
import { ReservationsApi } from "./reservations.server";
import { seedDatabase } from "./seed.server";
import { clearEmulator } from "./testing/emulator";

const BASE: NewReservation = {
  title: "Date Range Check",
  organization: "CEA Student Council",
  advisor: "Dr. Okafor",
  advisorEmail: "okafor@howard.edu",
  advisorApproved: true,
  purpose: "Assert from/to listing keeps rejected rows.",
  date: "2026-09-10",
  startTime: "10:00",
  endTime: "11:00",
  attendance: 10,
  room: "seminar-201",
  hasFood: false,
  externalGuests: false,
  itNeeds: false,
};

describe("reservation date-range list (#50)", () => {
  let api: ReservationsApi;

  beforeEach(async () => {
    await clearEmulator();
    await seedDatabase(getDb(), { reservations: [] });
    api = new ReservationsApi(getDb(), { reviewer: "Demo Admin" });
  });

  it("lists every status inside from/to and excludes dates outside", async () => {
    const early = await api.createReservation({
      ...BASE,
      title: "Too early",
      date: "2026-09-01",
    });
    const midPending = await api.createReservation({
      ...BASE,
      title: "Mid pending",
      date: "2026-09-10",
      startTime: "12:00",
      endTime: "13:00",
    });
    const midRejected = await api.createReservation({
      ...BASE,
      title: "Mid rejected",
      date: "2026-09-15",
      startTime: "14:00",
      endTime: "15:00",
    });
    await api.reviewReservation(midRejected.id, {
      decision: "rejected",
      feedback: "Room unavailable that week.",
    });
    const late = await api.createReservation({
      ...BASE,
      title: "Too late",
      date: "2026-09-30",
      room: "innovation",
    });

    const listed = await api.listReservations({ from: "2026-09-10", to: "2026-09-20" });
    assert.deepEqual(listed.map((row) => row.id).sort(), [midPending.id, midRejected.id].sort());
    assert.ok(listed.some((row) => row.id === midRejected.id && row.status === "rejected"));
    assert.ok(!listed.some((row) => row.id === early.id || row.id === late.id));

    const response = await handleListReservations(
      new Request("http://localhost/api/reservations?from=2026-09-10&to=2026-09-20"),
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as EventRequest[];
    assert.deepEqual(body.map((row) => row.id).sort(), [midPending.id, midRejected.id].sort());
  });

  it("rejects malformed from/to and from after to", async () => {
    await assert.rejects(() => api.listReservations({ from: "09-10-2026" }), TypeError);
    await assert.rejects(
      () => api.listReservations({ from: "2026-09-20", to: "2026-09-10" }),
      TypeError,
    );

    const bad = await handleListReservations(
      new Request("http://localhost/api/reservations?from=nope"),
    );
    assert.equal(bad.status, 400);
  });
});
