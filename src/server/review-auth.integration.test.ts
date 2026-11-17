// End-to-end of the #62 rule: review only after requireAdmin succeeds.
import { beforeEach, describe, it } from "vitest";
import assert from "node:assert/strict";
import type { NewReservation } from "@/domain/reservation";
import { AuthApi, ForbiddenError, UnauthorizedError } from "./auth.server";
import { errorResponse } from "./api.server";
import { getDb } from "./firestore.server";
import { ReservationsApi } from "./reservations.server";
import { clearEmulator } from "./testing/emulator";
import { seedDatabase } from "./seed.server";

const VALID: NewReservation = {
  title: "Auth Guard Review",
  organization: "CEA",
  advisor: "Dr. Okafor",
  advisorEmail: "okafor@howard.edu",
  advisorApproved: true,
  purpose: "Prove PATCH is admin-only.",
  date: "2026-07-01",
  startTime: "10:00",
  endTime: "11:00",
  attendance: 10,
  room: "seminar-201",
  hasFood: false,
  externalGuests: false,
  itNeeds: false,
};

describe("admin-only review (#62)", () => {
  let auth: AuthApi;
  let reservations: ReservationsApi;

  beforeEach(async () => {
    await clearEmulator();
    await seedDatabase(getDb(), { reservations: [] });
    auth = new AuthApi(getDb());
    reservations = new ReservationsApi(getDb());
  });

  it("maps missing and non-admin sessions to 401 and 403", async () => {
    assert.equal(errorResponse(new UnauthorizedError()).status, 401);
    assert.equal(errorResponse(new ForbiddenError()).status, 403);
  });

  it("rejects review without an admin session, then accepts an admin", async () => {
    const created = await reservations.createReservation(VALID);
    const input = { decision: "approved" as const, feedback: "" };

    await assert.rejects(() => auth.requireAdmin(null), UnauthorizedError);

    const student = await auth.signIn("student@cea.howard.edu", "student-demo");
    await assert.rejects(() => auth.requireAdmin(student.session.id), ForbiddenError);

    const admin = await auth.signIn("admin@cea.howard.edu", "admin-demo");
    const { user } = await auth.requireAdmin(admin.session.id);
    const reviewed = await new ReservationsApi(getDb(), {
      reviewer: user.name,
    }).reviewReservation(created.id, input);

    assert.equal(reviewed.status, "approved");
    assert.equal(reviewed.history[0]?.actor, "Demo Admin");
  });
});
