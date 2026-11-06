import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { EventRequest, RequestStatus } from "@/domain/reservation";
import { ReviewFeedbackError, type ReviewDecision } from "@/domain/review-decision";
import { InMemoryReservationRepository } from "./in-memory-reservation-repository";
import { ReservationNotFoundError } from "./reservation-repository";

function reservation(id: string, status: RequestStatus = "pending"): EventRequest {
  return {
    id,
    title: `Event ${id}`,
    organization: "NSBE",
    requester: "J. Abeje",
    date: "2026-11-04",
    startTime: "12:00",
    endTime: "13:00",
    attendance: 40,
    room: "lkd-confa",
    status,
    hasFood: false,
    externalGuests: false,
    afterHours: false,
    itNeeds: false,
    submittedAt: "2026-10-20",
    history: [],
  };
}

const FIXED_NOW = new Date("2026-11-06T04:13:00.000Z");
const FEEDBACK = "Please move to a larger room.";

describe("InMemoryReservationRepository", () => {
  it("lists every seeded reservation in seed order", async () => {
    const repository = new InMemoryReservationRepository([reservation("A"), reservation("B")]);
    const ids = (await repository.list()).map((r) => r.id);
    assert.deepEqual(ids, ["A", "B"]);
  });

  it("records a review and returns the updated record", async () => {
    const repository = new InMemoryReservationRepository([reservation("A")]);
    const updated = await repository.review("A", { decision: "approved", feedback: "" });
    assert.equal(updated.status, "approved");
    assert.equal((await repository.list())[0].status, "approved");
  });

  it("appends a history entry with the reviewer, time, and trimmed feedback", async () => {
    const repository = new InMemoryReservationRepository([reservation("A")], {
      reviewer: "Dean's Office",
      now: () => FIXED_NOW,
    });
    await repository.review("A", { decision: "needs-changes", feedback: `  ${FEEDBACK}  ` });
    const [stored] = await repository.list();
    assert.deepEqual(stored.history, [
      {
        from: "pending",
        to: "needs-changes",
        actor: "Dean's Office",
        feedback: FEEDBACK,
        at: FIXED_NOW.toISOString(),
      },
    ]);
  });

  it("rejects missing feedback for Reject without changing stored state", async () => {
    const repository = new InMemoryReservationRepository([reservation("A")]);
    await assert.rejects(
      repository.review("A", { decision: "rejected", feedback: "no" }),
      ReviewFeedbackError,
    );
    const [stored] = await repository.list();
    assert.equal(stored.status, "pending");
    assert.deepEqual(stored.history, []);
  });

  it("rejects unknown ids with ReservationNotFoundError", async () => {
    const repository = new InMemoryReservationRepository([reservation("A")]);
    await assert.rejects(
      repository.review("missing", { decision: "approved", feedback: "" }),
      (error) => {
        assert.ok(error instanceof ReservationNotFoundError);
        assert.equal(error.reservationId, "missing");
        return true;
      },
    );
  });

  it("rejects decisions outside the domain at runtime", async () => {
    const repository = new InMemoryReservationRepository([reservation("A")]);
    const untrusted = "pending" as ReviewDecision;
    await assert.rejects(repository.review("A", { decision: untrusted, feedback: "" }), TypeError);
    assert.equal((await repository.list())[0].status, "pending");
  });

  it("never mutates the seed array passed in", async () => {
    const seed = [reservation("A")];
    const repository = new InMemoryReservationRepository(seed);
    await repository.review("A", { decision: "rejected", feedback: FEEDBACK });
    assert.equal(seed[0].status, "pending");
    assert.deepEqual(seed[0].history, []);
  });

  it("returns copies so callers cannot change stored state", async () => {
    const repository = new InMemoryReservationRepository([reservation("A")]);
    await repository.review("A", { decision: "approved", feedback: "" });
    const [listed] = await repository.list();
    listed.status = "rejected";
    (listed.history[0] as { actor: string }).actor = "someone else";
    const [stored] = await repository.list();
    assert.equal(stored.status, "approved");
    assert.equal(stored.history[0].actor, "Dean's Office");
  });

  it("refuses a seed with duplicate ids", () => {
    assert.throws(
      () => new InMemoryReservationRepository([reservation("A"), reservation("A")]),
      /Duplicate reservation id in seed: A/,
    );
  });
});
