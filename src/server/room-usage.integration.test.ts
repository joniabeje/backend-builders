// GET /api/analytics/rooms returns per-room month totals for a seeded range (#51).
import { beforeEach, describe, it } from "vitest";
import assert from "node:assert/strict";
import type { NewReservation } from "@/domain/reservation";
import type { RoomUsageReport } from "@/domain/room-usage";
import { handleRoomUsage } from "./analytics-http.server";
import { getAuthApi } from "./auth.server";
import { SESSION_COOKIE } from "./cookies.server";
import { getDb } from "./firestore.server";
import { ReservationsApi } from "./reservations.server";
import { seedDatabase } from "./seed.server";
import { clearEmulator } from "./testing/emulator";

const BASE: NewReservation = {
  title: "Usage Seed",
  organization: "CEA",
  advisor: "Dr. Okafor",
  advisorEmail: "okafor@howard.edu",
  advisorApproved: true,
  purpose: "Seed analytics month.",
  date: "2026-09-10",
  startTime: "10:00",
  endTime: "11:00",
  attendance: 10,
  room: "seminar-201",
  hasFood: false,
  externalGuests: false,
  itNeeds: false,
};

function cookieHeader(sessionId: string): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}`;
}

describe("room usage analytics (#51)", () => {
  let api: ReservationsApi;

  beforeEach(async () => {
    await clearEmulator();
    await seedDatabase(getDb(), { reservations: [] });
    api = new ReservationsApi(getDb(), { reviewer: "Demo Admin" });
  });

  it("returns bookings and approved hours per room for a seeded month", async () => {
    const first = await api.createReservation({
      ...BASE,
      title: "Morning",
      date: "2026-09-10",
      startTime: "10:00",
      endTime: "11:00",
    });
    await api.reviewReservation(first.id, { decision: "approved", feedback: "" });

    const second = await api.createReservation({
      ...BASE,
      title: "Afternoon",
      date: "2026-09-11",
      startTime: "13:00",
      endTime: "15:00",
      room: "innovation",
    });
    await api.reviewReservation(second.id, { decision: "approved", feedback: "" });

    await api.createReservation({
      ...BASE,
      title: "Still pending",
      date: "2026-09-12",
      startTime: "09:00",
      endTime: "10:00",
      room: "seminar-201",
    });

    const rejected = await api.createReservation({
      ...BASE,
      title: "Rejected",
      date: "2026-09-13",
      startTime: "11:00",
      endTime: "12:00",
      room: "innovation",
    });
    await api.reviewReservation(rejected.id, {
      decision: "rejected",
      feedback: "Conflicts with maintenance.",
    });

    const report = await api.roomUsage("2026-09-01", "2026-09-30");
    assert.deepEqual(report.byStatus, {
      pending: 1,
      approved: 2,
      rejected: 1,
      "needs-changes": 0,
    });

    const seminar = report.rooms.find((row) => row.roomId === "seminar-201");
    const innovation = report.rooms.find((row) => row.roomId === "innovation");
    assert.deepEqual(seminar?.months, [{ month: "2026-09", bookings: 2, approvedHours: 1 }]);
    assert.deepEqual(innovation?.months, [{ month: "2026-09", bookings: 2, approvedHours: 2 }]);

    const { session } = await getAuthApi().signIn("admin@cea.howard.edu", "admin-demo");
    const response = await handleRoomUsage(
      new Request("http://localhost/api/analytics/rooms?from=2026-09-01&to=2026-09-30", {
        headers: { Cookie: cookieHeader(session.id) },
      }),
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as RoomUsageReport;
    assert.deepEqual(body.byStatus, report.byStatus);
  });

  it("requires an admin session", async () => {
    const signedOut = await handleRoomUsage(
      new Request("http://localhost/api/analytics/rooms?from=2026-09-01&to=2026-09-30"),
    );
    assert.equal(signedOut.status, 401);

    const student = await getAuthApi().signIn("student@cea.howard.edu", "student-demo");
    const forbidden = await handleRoomUsage(
      new Request("http://localhost/api/analytics/rooms?from=2026-09-01&to=2026-09-30", {
        headers: { Cookie: cookieHeader(student.session.id) },
      }),
    );
    assert.equal(forbidden.status, 403);
  });
});
