// GET /api/reservations?requester=me and session-tagged creates (#36).
import { beforeEach, describe, it } from "vitest";
import assert from "node:assert/strict";
import type { NewReservation } from "@/domain/reservation";
import { getAuthApi } from "./auth.server";
import { SESSION_COOKIE } from "./cookies.server";
import { getDb } from "./firestore.server";
import { handleListReservations } from "./reservations-http.server";
import { ReservationsApi } from "./reservations.server";
import { seedDatabase } from "./seed.server";
import { clearEmulator } from "./testing/emulator";

const VALID: NewReservation = {
  title: "My Requests Check",
  organization: "CEA Student Council",
  advisor: "Dr. Okafor",
  advisorEmail: "okafor@howard.edu",
  advisorApproved: true,
  purpose: "Confirm requester=me scoping.",
  date: "2026-07-01",
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

describe("my reservations (#36)", () => {
  beforeEach(async () => {
    await clearEmulator();
    await seedDatabase(getDb(), { reservations: [] });
  });

  it("lists only the signed-in user's requests for requester=me", async () => {
    const auth = getAuthApi();
    const student = await auth.signIn("student@cea.howard.edu", "student-demo");
    const admin = await auth.signIn("admin@cea.howard.edu", "admin-demo");
    const api = new ReservationsApi(getDb());

    const studentRequest = await api.createReservation(VALID, {
      id: student.user.id,
      name: student.user.name,
    });
    await api.createReservation(
      { ...VALID, title: "Admin Planning", date: "2026-07-02" },
      { id: admin.user.id, name: admin.user.name },
    );

    const studentMine = await api.listReservations({ requesterId: student.user.id });
    assert.deepEqual(
      studentMine.map((row) => row.id),
      [studentRequest.id],
    );

    const adminMine = await api.listReservations({ requesterId: admin.user.id });
    assert.equal(adminMine.length, 1);
    assert.equal(adminMine[0].title, "Admin Planning");
    assert.equal((await api.listReservations()).length, 2);
  });

  it("GET requester=me returns 401 when signed out and the caller's rows when signed in", async () => {
    const auth = getAuthApi();
    const student = await auth.signIn("student@cea.howard.edu", "student-demo");
    const api = new ReservationsApi(getDb());
    const created = await api.createReservation(VALID, {
      id: student.user.id,
      name: student.user.name,
    });

    const signedOut = await handleListReservations(
      new Request("http://localhost/api/reservations?requester=me"),
    );
    assert.equal(signedOut.status, 401);

    const signedIn = await handleListReservations(
      new Request("http://localhost/api/reservations?requester=me", {
        headers: { cookie: cookieHeader(student.session.id) },
      }),
    );
    assert.equal(signedIn.status, 200);
    const body = (await signedIn.json()) as { id: string }[];
    assert.deepEqual(
      body.map((row) => row.id),
      [created.id],
    );
  });
});
