import { beforeEach, describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  ReservationConflictError,
  ReservationNotFoundError,
  ReservationValidationError,
} from "@/data/reservation-repository";
import type { NewReservation } from "@/domain/reservation";
import { ReviewFeedbackError } from "@/domain/review-decision";
import { ROOMS } from "@/lib/rooms";
import { getDb } from "./firestore.server";
import { ReservationsApi } from "./reservations.server";
import { seedDatabase } from "./seed.server";
import { clearEmulator } from "./testing/emulator";

const VALID: NewReservation = {
  title: "Backend Builders Sync",
  organization: "CEA Student Council",
  advisor: "Dr. Okafor",
  advisorEmail: "okafor@howard.edu",
  advisorApproved: true,
  purpose: "Sprint planning for the reservation system.",
  date: "2026-06-01",
  startTime: "14:00",
  endTime: "15:00",
  attendance: 12,
  room: "seminar-201",
  hasFood: false,
  externalGuests: false,
  itNeeds: false,
};

describe("ReservationsApi", () => {
  let api: ReservationsApi;

  beforeEach(async () => {
    await clearEmulator();
    await seedDatabase(getDb(), { reservations: [] });
    api = new ReservationsApi(getDb());
  });

  it("lists the seeded CEA rooms", async () => {
    const rooms = await api.listRooms();
    assert.equal(rooms.length, ROOMS.length);
    assert.ok(rooms.some((room) => room.id === "seminar-201" && room.capacity === 25));
  });

  it("creates a reservation, returns it from GET, and lists it", async () => {
    const created = await api.createReservation(VALID);

    assert.match(created.id, /^REQ-\d+$/);
    assert.equal(created.status, "pending");
    assert.equal(created.requester, "Unverified requester");
    assert.equal(created.risk.level, "low");
    assert.equal(created.history.length, 0);

    const fetched = await api.getReservation(created.id);
    assert.deepEqual(fetched, created);

    const listed = await api.listReservations();
    assert.equal(listed.length, 1);
    assert.equal(listed[0].id, created.id);
  });

  it("rejects invalid create bodies with field errors", async () => {
    await assert.rejects(
      () =>
        api.createReservation({ ...VALID, advisorEmail: "not-an-email", advisorApproved: false }),
      (error: unknown) => {
        assert.ok(error instanceof ReservationValidationError);
        const codes = error.issues.map((issue) => issue.code);
        assert.ok(codes.includes("advisor-email-invalid"));
        assert.ok(codes.includes("advisor-approval-missing"));
        return true;
      },
    );
    assert.equal((await api.listReservations()).length, 0);
  });

  it("rejects a double booking with the conflicting ids", async () => {
    const first = await api.createReservation(VALID);
    await assert.rejects(
      () =>
        api.createReservation({
          ...VALID,
          title: "Overlap",
          startTime: "14:30",
          endTime: "15:30",
        }),
      (error: unknown) => {
        assert.ok(error instanceof ReservationConflictError);
        assert.deepEqual(
          error.conflicts.map((conflict) => conflict.id),
          [first.id],
        );
        return true;
      },
    );
  });

  it("allows a booking that starts exactly when another ends", async () => {
    await api.createReservation(VALID);
    const next = await api.createReservation({
      ...VALID,
      title: "Back to back",
      startTime: "15:00",
      endTime: "16:00",
    });
    assert.equal(next.startTime, "15:00");
    assert.equal((await api.listReservations()).length, 2);
  });

  it("only one of two parallel creates for the same slot succeeds (#65)", async () => {
    const results = await Promise.allSettled([
      api.createReservation(VALID),
      api.createReservation({ ...VALID, title: "Parallel twin" }),
    ]);
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.ok(rejected[0].status === "rejected");
    assert.ok(rejected[0].reason instanceof ReservationConflictError);
    assert.equal((await api.listReservations()).length, 1);
  });

  it("stores server-computed high risk on create", async () => {
    const created = await api.createReservation({
      ...VALID,
      room: "lkd-aud",
      attendance: 240,
      externalGuests: true,
      hasFood: true,
      startTime: "17:00",
      endTime: "21:00",
    });
    assert.equal(created.risk.level, "high");
    assert.equal(created.risk.requiresReview, true);
    assert.ok(created.risk.factors.length > 0);
  });

  it("patches a review decision and writes history", async () => {
    const created = await api.createReservation(VALID);
    const reviewed = await api.reviewReservation(created.id, {
      decision: "approved",
      feedback: "",
    });

    assert.equal(reviewed.status, "approved");
    assert.equal(reviewed.history.length, 1);
    assert.equal(reviewed.history[0].from, "pending");
    assert.equal(reviewed.history[0].to, "approved");
    assert.equal(reviewed.history[0].actor, "Dean's Office");

    const fetched = await api.getReservation(created.id);
    assert.equal(fetched.status, "approved");
    assert.equal(fetched.history.length, 1);
  });

  it("requires feedback when rejecting", async () => {
    const created = await api.createReservation(VALID);
    await assert.rejects(
      () => api.reviewReservation(created.id, { decision: "rejected", feedback: "short" }),
      ReviewFeedbackError,
    );
  });

  it("returns not found for unknown ids", async () => {
    await assert.rejects(() => api.getReservation("REQ-9999"), ReservationNotFoundError);
    await assert.rejects(
      () => api.reviewReservation("REQ-9999", { decision: "approved", feedback: "" }),
      ReservationNotFoundError,
    );
  });
});
