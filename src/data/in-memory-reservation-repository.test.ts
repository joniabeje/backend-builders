import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { EventRequest, RequestStatus } from "@/domain/reservation";
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
  };
}

describe("InMemoryReservationRepository", () => {
  it("lists every seeded reservation in seed order", async () => {
    const repository = new InMemoryReservationRepository([reservation("A"), reservation("B")]);
    const ids = (await repository.list()).map((r) => r.id);
    assert.deepEqual(ids, ["A", "B"]);
  });

  it("updates a reservation's status and returns the updated record", async () => {
    const repository = new InMemoryReservationRepository([reservation("A")]);
    const updated = await repository.updateStatus("A", "approved");
    assert.equal(updated.status, "approved");
    assert.equal((await repository.list())[0].status, "approved");
  });

  it("rejects unknown ids with ReservationNotFoundError", async () => {
    const repository = new InMemoryReservationRepository([reservation("A")]);
    await assert.rejects(repository.updateStatus("missing", "approved"), (error) => {
      assert.ok(error instanceof ReservationNotFoundError);
      assert.equal(error.reservationId, "missing");
      return true;
    });
  });

  it("rejects statuses outside the domain at runtime", async () => {
    const repository = new InMemoryReservationRepository([reservation("A")]);
    const untrusted = "archived" as RequestStatus;
    await assert.rejects(repository.updateStatus("A", untrusted), TypeError);
    assert.equal((await repository.list())[0].status, "pending");
  });

  it("never mutates the seed array passed in", async () => {
    const seed = [reservation("A")];
    const repository = new InMemoryReservationRepository(seed);
    await repository.updateStatus("A", "rejected");
    assert.equal(seed[0].status, "pending");
  });

  it("returns copies so callers cannot change stored state", async () => {
    const repository = new InMemoryReservationRepository([reservation("A")]);
    const [listed] = await repository.list();
    listed.status = "approved";
    assert.equal((await repository.list())[0].status, "pending");
  });

  it("refuses a seed with duplicate ids", () => {
    assert.throws(
      () => new InMemoryReservationRepository([reservation("A"), reservation("A")]),
      /Duplicate reservation id in seed: A/,
    );
  });
});
