// Security smoke (#63): PATCH /api/reservations/:id returns 401 signed out and 403 as a
// student. Runs under `npm run test:integration` (Firestore emulator) in CI.
import { beforeEach, describe, it } from "vitest";
import assert from "node:assert/strict";
import type { NewReservation } from "@/domain/reservation";
import { AuthApi } from "./auth.server";
import { SESSION_COOKIE } from "./cookies.server";
import { getDb } from "./firestore.server";
import { handleReviewPatch } from "./review-http.server";
import { ReservationsApi } from "./reservations.server";
import { seedDatabase } from "./seed.server";
import { clearEmulator } from "./testing/emulator";

const VALID: NewReservation = {
  title: "Security Smoke Event",
  organization: "CEA",
  advisor: "Dr. Okafor",
  advisorEmail: "okafor@howard.edu",
  advisorApproved: true,
  purpose: "Unauthorized admin mutation must fail.",
  date: "2026-08-01",
  startTime: "13:00",
  endTime: "14:00",
  attendance: 8,
  room: "seminar-201",
  hasFood: false,
  externalGuests: false,
  itNeeds: false,
};

function reviewRequest(cookie?: string): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (cookie) headers.set("Cookie", `${SESSION_COOKIE}=${encodeURIComponent(cookie)}`);
  return new Request("http://127.0.0.1/api/reservations/placeholder", {
    method: "PATCH",
    headers,
    body: JSON.stringify({ decision: "approved", feedback: "" }),
  });
}

describe("security smoke: unauthorized admin mutations (#63)", () => {
  let reservationId: string;
  let auth: AuthApi;

  beforeEach(async () => {
    await clearEmulator();
    await seedDatabase(getDb(), { reservations: [] });
    auth = new AuthApi(getDb());
    const created = await new ReservationsApi(getDb()).createReservation(VALID);
    reservationId = created.id;
  });

  it("returns 401 when the admin mutation is called signed out", async () => {
    const response = await handleReviewPatch(reviewRequest(), reservationId);
    assert.equal(response.status, 401);
    const body = (await response.json()) as { error: string };
    assert.match(body.error, /sign in required/i);
  });

  it("returns 403 when the admin mutation is called as a student", async () => {
    const { session } = await auth.signIn("student@cea.howard.edu", "student-demo");
    const response = await handleReviewPatch(reviewRequest(session.id), reservationId);
    assert.equal(response.status, 403);
    const body = (await response.json()) as { error: string };
    assert.match(body.error, /admin/i);
  });

  it("returns 200 when an admin reviews the same reservation", async () => {
    const { session } = await auth.signIn("admin@cea.howard.edu", "admin-demo");
    const response = await handleReviewPatch(reviewRequest(session.id), reservationId);
    assert.equal(response.status, 200);
    const body = (await response.json()) as { status: string; history: { actor: string }[] };
    assert.equal(body.status, "approved");
    assert.equal(body.history[0]?.actor, "Demo Admin");
  });
});
