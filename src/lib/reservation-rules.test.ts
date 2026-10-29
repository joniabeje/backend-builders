import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reviewReservation, type ReservationDraft } from "./reservation-rules.ts";

const seminar = { id: "seminar-201", name: "Seminar Room 201", capacity: 25 };

const ready: ReservationDraft = {
  title: "Robotics Club Workshop",
  organization: "Bison Robotics",
  advisor: "Dr. Williams",
  date: "2026-05-02",
  startTime: "14:00",
  endTime: "16:00",
  attendance: "20",
  purpose: "Build night",
  room: "seminar-201",
  hasFood: false,
  externalGuests: false,
};

describe("reviewReservation", () => {
  it("accepts a complete daytime request", () => {
    const review = reviewReservation(ready, [seminar]);
    assert.equal(review.attendance, 20);
    assert.equal(review.isAfterHours, false);
    assert.deepEqual(review.issues, []);
    assert.equal(review.requiredOk, true);
    assert.equal(review.canSubmit, true);
  });

  it("does not submit an empty form", () => {
    const review = reviewReservation(
      {
        ...ready,
        title: "",
        organization: "",
        advisor: "",
        date: "",
        startTime: "",
        endTime: "",
        attendance: "",
        purpose: "",
        room: "",
      },
      [seminar],
    );
    assert.deepEqual(review.issues, []);
    assert.equal(review.requiredOk, false);
    assert.equal(review.canSubmit, false);
  });

  it("blocks attendance below 1 and over capacity with the existing wording", () => {
    const low = reviewReservation({ ...ready, attendance: "0" }, [seminar]);
    assert.equal(low.canSubmit, false);
    assert.deepEqual(low.issues, [{ type: "error", msg: "Attendance must be at least 1." }]);

    const crowded = reviewReservation({ ...ready, attendance: "40" }, [seminar]);
    assert.equal(crowded.canSubmit, false);
    assert.deepEqual(crowded.issues, [
      { type: "error", msg: "Seminar Room 201 capacity is 25 — exceeds attendance." },
    ]);
  });

  it("blocks an end time that is not after the start", () => {
    const review = reviewReservation({ ...ready, startTime: "16:00", endTime: "16:00" }, [seminar]);
    assert.equal(review.canSubmit, false);
    assert.equal(review.issues[0]?.msg, "End time must be after start time.");
  });

  it("keeps the prototype after-hours hours instead of a flat 8-to-18 window", () => {
    const endsAtSeven = reviewReservation({ ...ready, startTime: "17:00", endTime: "19:00" }, [
      seminar,
    ]);
    assert.equal(endsAtSeven.isAfterHours, false);

    const endsAtEight = reviewReservation({ ...ready, startTime: "17:00", endTime: "20:00" }, [
      seminar,
    ]);
    assert.equal(endsAtEight.isAfterHours, true);
    assert.equal(endsAtEight.canSubmit, true);
    assert.equal(
      endsAtEight.issues[0]?.msg,
      "After-hours event — supervisor confirmation required.",
    );
  });

  it("still blocks an over-capacity room when warnings are also present", () => {
    const review = reviewReservation(
      { ...ready, attendance: "50", hasFood: true, externalGuests: true },
      [seminar],
    );
    assert.equal(review.canSubmit, false);
    assert.deepEqual(
      review.issues.map((issue) => issue.type),
      ["error", "warn", "warn"],
    );
  });

  it("allows food and guests when the room can hold the group", () => {
    const atrium = { id: "atrium", name: "Grand Atrium", capacity: 150 };
    const review = reviewReservation(
      { ...ready, room: "atrium", attendance: "50", hasFood: true, externalGuests: true },
      [atrium],
    );
    assert.equal(review.canSubmit, true);
    assert.deepEqual(
      review.issues.map((issue) => issue.msg),
      [
        "External guests + large attendance — security may be required.",
        "Food service — custodial pre/post event scheduling will be triggered.",
      ],
    );
  });
});
