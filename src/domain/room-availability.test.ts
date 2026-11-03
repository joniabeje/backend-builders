import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { RequestStatus } from "./reservation.ts";
import {
  findConflicts,
  findReservationInProgress,
  getRoomAvailability,
  isCompleteSlot,
  timeRangesOverlap,
  type BookedSlot,
  type RequestedSlot,
} from "./room-availability.ts";

const booking = (overrides: Partial<BookedSlot> = {}): BookedSlot => ({
  id: "REQ-1",
  room: "innovation",
  date: "2026-05-02",
  startTime: "14:00",
  endTime: "16:00",
  status: "approved",
  ...overrides,
});

const slot = (overrides: Partial<RequestedSlot> = {}): RequestedSlot => ({
  roomId: "innovation",
  date: "2026-05-02",
  startTime: "14:00",
  endTime: "16:00",
  ...overrides,
});

const conflictIds = (requested: RequestedSlot, existing: BookedSlot[]) =>
  findConflicts(requested, existing).map((conflict) => conflict.id);

describe("timeRangesOverlap", () => {
  it("treats touching boundaries as free", () => {
    assert.equal(timeRangesOverlap(12 * 60, 14 * 60, 14 * 60, 16 * 60), false);
    assert.equal(timeRangesOverlap(16 * 60, 18 * 60, 14 * 60, 16 * 60), false);
  });

  it("detects partial, contained, containing, and identical ranges", () => {
    assert.equal(timeRangesOverlap(13 * 60, 15 * 60, 14 * 60, 16 * 60), true);
    assert.equal(timeRangesOverlap(14 * 60 + 30, 15 * 60, 14 * 60, 16 * 60), true);
    assert.equal(timeRangesOverlap(13 * 60, 17 * 60, 14 * 60, 16 * 60), true);
    assert.equal(timeRangesOverlap(14 * 60, 16 * 60, 14 * 60, 16 * 60), true);
  });
});

describe("findConflicts", () => {
  const existing = [booking()];

  it("allows back-to-back bookings in the same room", () => {
    assert.deepEqual(conflictIds(slot({ startTime: "12:00", endTime: "14:00" }), existing), []);
    assert.deepEqual(conflictIds(slot({ startTime: "16:00", endTime: "17:00" }), existing), []);
  });

  it("flags a partial overlap", () => {
    assert.deepEqual(conflictIds(slot({ startTime: "15:00", endTime: "17:00" }), existing), [
      "REQ-1",
    ]);
  });

  it("flags a request fully inside an existing booking, and one that wraps it", () => {
    assert.deepEqual(conflictIds(slot({ startTime: "14:30", endTime: "15:30" }), existing), [
      "REQ-1",
    ]);
    assert.deepEqual(conflictIds(slot({ startTime: "09:00", endTime: "20:00" }), existing), [
      "REQ-1",
    ]);
  });

  it("ignores bookings in a different room or on a different date", () => {
    assert.deepEqual(conflictIds(slot({ roomId: "atrium" }), existing), []);
    assert.deepEqual(conflictIds(slot({ date: "2026-05-03" }), existing), []);
  });

  it("only counts statuses that hold the room", () => {
    const holding: RequestStatus[] = ["pending", "approved", "needs-changes"];
    for (const status of holding) {
      assert.deepEqual(conflictIds(slot(), [booking({ status })]), ["REQ-1"], status);
    }
    assert.deepEqual(conflictIds(slot(), [booking({ status: "rejected" })]), []);
  });

  it("returns every conflicting booking", () => {
    const morning = booking({ id: "REQ-2", startTime: "09:00", endTime: "11:00" });
    const afternoon = booking({ id: "REQ-3", startTime: "15:00", endTime: "17:00" });
    assert.deepEqual(
      conflictIds(slot({ startTime: "10:00", endTime: "16:00" }), [morning, afternoon]),
      ["REQ-2", "REQ-3"],
    );
  });

  it("does not let a reservation conflict with itself when editing", () => {
    assert.deepEqual(findConflicts(slot(), existing, { excludeId: "REQ-1" }), []);
  });

  it("returns no conflicts for an incomplete or invalid slot", () => {
    assert.deepEqual(conflictIds(slot({ roomId: "" }), existing), []);
    assert.deepEqual(conflictIds(slot({ date: "" }), existing), []);
    assert.deepEqual(conflictIds(slot({ startTime: "" }), existing), []);
    assert.deepEqual(conflictIds(slot({ startTime: "16:00", endTime: "14:00" }), existing), []);
  });

  it("treats a stored booking with unreadable times as blocking", () => {
    assert.deepEqual(conflictIds(slot(), [booking({ startTime: "2pm" })]), ["REQ-1"]);
  });
});

describe("getRoomAvailability", () => {
  it("reports each room's availability and conflicts for the slot", () => {
    const availability = getRoomAvailability(
      ["innovation", "atrium"],
      { date: "2026-05-02", startTime: "15:00", endTime: "16:00" },
      [booking()],
    );
    assert.equal(availability.get("innovation")?.available, false);
    assert.deepEqual(
      availability.get("innovation")?.conflicts.map((conflict) => conflict.id),
      ["REQ-1"],
    );
    assert.equal(availability.get("atrium")?.available, true);
  });

  it("re-evaluates when the time changes", () => {
    const at = (startTime: string, endTime: string) =>
      getRoomAvailability(["innovation"], { date: "2026-05-02", startTime, endTime }, [
        booking(),
      ]).get("innovation")?.available;
    assert.equal(at("15:00", "16:00"), false);
    assert.equal(at("16:00", "17:00"), true);
  });
});

describe("isCompleteSlot", () => {
  it("needs a date and an ordered, valid time range", () => {
    assert.equal(
      isCompleteSlot({ date: "2026-05-02", startTime: "14:00", endTime: "16:00" }),
      true,
    );
    assert.equal(isCompleteSlot({ date: "", startTime: "14:00", endTime: "16:00" }), false);
    assert.equal(isCompleteSlot({ date: "2026-05-02", startTime: "14:00", endTime: "" }), false);
    assert.equal(
      isCompleteSlot({ date: "2026-05-02", startTime: "16:00", endTime: "14:00" }),
      false,
    );
  });
});

describe("findReservationInProgress", () => {
  it("finds the booking covering a minute, with the end exclusive", () => {
    const existing = [booking()];
    assert.equal(
      findReservationInProgress("innovation", "2026-05-02", 14 * 60, existing)?.id,
      "REQ-1",
    );
    assert.equal(
      findReservationInProgress("innovation", "2026-05-02", 15 * 60 + 59, existing)?.id,
      "REQ-1",
    );
    assert.equal(
      findReservationInProgress("innovation", "2026-05-02", 16 * 60, existing),
      undefined,
    );
    assert.equal(
      findReservationInProgress("innovation", "2026-05-02", 13 * 60 + 59, existing),
      undefined,
    );
  });

  it("ignores rejected bookings", () => {
    assert.equal(
      findReservationInProgress("innovation", "2026-05-02", 15 * 60, [
        booking({ status: "rejected" }),
      ]),
      undefined,
    );
  });
});
