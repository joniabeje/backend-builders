import { describe, it } from "vitest";
import assert from "node:assert/strict";
import type { NewReservation, RequestStatus, UnscoredEventRequest } from "@/domain/reservation";
import { ReviewFeedbackError, type ReviewDecision } from "@/domain/review-decision";
import {
  InMemoryReservationRepository,
  UNVERIFIED_REQUESTER,
} from "./in-memory-reservation-repository";
import { ReservationConflictError, ReservationNotFoundError } from "./reservation-repository";

function reservation(id: string, status: RequestStatus = "pending"): UnscoredEventRequest {
  return {
    id,
    title: `Event ${id}`,
    organization: "NSBE",
    requester: "J. Abeje",
    advisor: "Dr. Williams",
    advisorEmail: "williams@howard.edu",
    advisorApproved: true,
    purpose: "Chapter meeting",
    date: "2026-11-04",
    startTime: "12:00",
    endTime: "13:00",
    attendance: 40,
    room: "lkd-confa",
    status,
    hasFood: false,
    externalGuests: false,
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

  it("computes and stores risk for each reservation, deriving after-hours from the times", async () => {
    const lateNight = { ...reservation("A"), startTime: "19:00", endTime: "22:00" };
    const repository = new InMemoryReservationRepository([lateNight, reservation("B")]);
    const [a, b] = await repository.list();
    assert.deepEqual(
      a.risk.factors.map((factor) => factor.code),
      ["after-hours"],
    );
    assert.equal(b.risk.level, "low");
  });

  it("keeps the stored risk when a reservation is reviewed", async () => {
    const big = { ...reservation("A"), attendance: 200, hasFood: true, externalGuests: true };
    const repository = new InMemoryReservationRepository([big]);
    const updated = await repository.review("A", { decision: "approved", feedback: "" });
    assert.equal(updated.risk.level, "high");
    assert.equal(updated.risk.requiresReview, true);
  });

  it("does not let callers change stored risk through a listed copy", async () => {
    const repository = new InMemoryReservationRepository([reservation("A")]);
    const [listed] = await repository.list();
    (listed.risk.factors as unknown as { reason: string }[]).push({ reason: "tampered" });
    assert.deepEqual((await repository.list())[0].risk.factors, []);
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

describe("InMemoryReservationRepository.create", () => {
  const NEW: NewReservation = {
    title: "Robotics Workshop",
    organization: "Bison Robotics",
    advisor: "Dr. Harris",
    advisorEmail: "harris@howard.edu",
    advisorApproved: true,
    purpose: "Hands-on workshop",
    date: "2026-12-01",
    startTime: "10:00",
    endTime: "11:00",
    attendance: 20,
    room: "innovation",
    hasFood: false,
    externalGuests: false,
    itNeeds: true,
  };

  it("stores a pending request with store-assigned fields and returns it", async () => {
    const repository = new InMemoryReservationRepository([], { now: () => FIXED_NOW });
    const created = await repository.create(NEW);

    assert.deepEqual(
      { ...created, risk: undefined },
      {
        ...NEW,
        id: "REQ-1001",
        requester: UNVERIFIED_REQUESTER,
        status: "pending",
        submittedAt: "2026-11-06",
        history: [],
        risk: undefined,
      },
    );
    assert.deepEqual(await repository.list(), [created]);
  });

  it("numbers new ids one above the highest stored id", async () => {
    const repository = new InMemoryReservationRepository([
      reservation("REQ-1042"),
      reservation("REQ-1038"),
      reservation("legacy-id"),
    ]);
    assert.equal((await repository.create(NEW)).id, "REQ-1043");
    assert.equal(
      (await repository.create({ ...NEW, startTime: "11:00", endTime: "12:00" })).id,
      "REQ-1044",
    );
  });

  it("records the configured requester", async () => {
    const repository = new InMemoryReservationRepository([], { requester: "J. Abeje" });
    assert.equal((await repository.create(NEW)).requester, "J. Abeje");
  });

  it("computes risk from the submitted fields, deriving after-hours from the times", async () => {
    const repository = new InMemoryReservationRepository([]);
    const created = await repository.create({
      ...NEW,
      attendance: 200,
      startTime: "19:00",
      endTime: "22:00",
      hasFood: true,
    });
    assert.equal(created.risk.level, "high");
    assert.equal(created.risk.requiresReview, true);
    assert.deepEqual(
      created.risk.factors.map((factor) => factor.code),
      ["large-attendance", "after-hours", "food-service"],
    );
  });

  it("rejects a double booking and saves nothing (#67)", async () => {
    const existing = {
      ...reservation("REQ-1040"),
      room: NEW.room,
      date: NEW.date,
      startTime: "10:30",
      endTime: "12:00",
    };
    const repository = new InMemoryReservationRepository([existing]);

    await assert.rejects(repository.create(NEW), (error: unknown) => {
      assert.ok(error instanceof ReservationConflictError);
      assert.deepEqual(
        error.conflicts.map((c) => c.id),
        ["REQ-1040"],
      );
      return true;
    });
    assert.equal((await repository.list()).length, 1);
  });

  it("allows a booking that starts exactly when another ends (#67)", async () => {
    const existing = {
      ...reservation("REQ-1040"),
      room: NEW.room,
      date: NEW.date,
      startTime: "10:00",
      endTime: "11:00",
    };
    const repository = new InMemoryReservationRepository([existing]);
    const created = await repository.create({
      ...NEW,
      startTime: "11:00",
      endTime: "12:00",
    });
    assert.equal(created.startTime, "11:00");
    assert.equal((await repository.list()).length, 2);
  });

  it("allows the slot once the overlapping request is rejected", async () => {
    const rejected = {
      ...reservation("REQ-1040", "rejected"),
      room: NEW.room,
      date: NEW.date,
      startTime: "10:00",
      endTime: "11:00",
    };
    const repository = new InMemoryReservationRepository([rejected]);
    assert.equal((await repository.create(NEW)).status, "pending");
  });

  it("returns a copy, so changing it does not change the stored request", async () => {
    const repository = new InMemoryReservationRepository([]);
    const created = await repository.create(NEW);
    created.title = "Changed";
    assert.equal((await repository.list())[0].title, NEW.title);
  });
});
