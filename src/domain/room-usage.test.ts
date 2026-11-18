import { describe, it } from "vitest";
import assert from "node:assert/strict";
import type { RequestStatus } from "./reservation";
import { aggregateRoomUsage, durationHours, emptyStatusCounts, monthKey } from "./room-usage";

type Row = {
  id: string;
  room: string;
  date: string;
  startTime: string;
  endTime: string;
  status: RequestStatus;
};

/** 12 reservations across rooms, months, and statuses for #53. */
const FIXTURE: Row[] = [
  {
    id: "1",
    room: "seminar-201",
    date: "2026-09-01",
    startTime: "10:00",
    endTime: "11:00",
    status: "approved",
  },
  {
    id: "2",
    room: "seminar-201",
    date: "2026-09-02",
    startTime: "13:00",
    endTime: "15:00",
    status: "approved",
  },
  {
    id: "3",
    room: "seminar-201",
    date: "2026-09-03",
    startTime: "09:00",
    endTime: "10:00",
    status: "pending",
  },
  {
    id: "4",
    room: "seminar-201",
    date: "2026-10-01",
    startTime: "10:00",
    endTime: "12:00",
    status: "approved",
  },
  {
    id: "5",
    room: "innovation",
    date: "2026-09-05",
    startTime: "14:00",
    endTime: "16:30",
    status: "approved",
  },
  {
    id: "6",
    room: "innovation",
    date: "2026-09-06",
    startTime: "10:00",
    endTime: "11:00",
    status: "rejected",
  },
  {
    id: "7",
    room: "innovation",
    date: "2026-09-07",
    startTime: "11:00",
    endTime: "12:00",
    status: "needs-changes",
  },
  {
    id: "8",
    room: "lkd-aud",
    date: "2026-09-10",
    startTime: "18:00",
    endTime: "20:00",
    status: "approved",
  },
  {
    id: "9",
    room: "lkd-aud",
    date: "2026-09-11",
    startTime: "09:00",
    endTime: "10:00",
    status: "pending",
  },
  {
    id: "10",
    room: "atrium",
    date: "2026-08-20",
    startTime: "12:00",
    endTime: "13:00",
    status: "approved",
  },
  {
    id: "11",
    room: "atrium",
    date: "2026-09-15",
    startTime: "12:00",
    endTime: "14:00",
    status: "approved",
  },
  {
    id: "12",
    room: "arch-mp-b",
    date: "2026-09-20",
    startTime: "08:00",
    endTime: "09:30",
    status: "rejected",
  },
];

describe("durationHours", () => {
  it("returns fractional hours for same-day spans", () => {
    assert.equal(durationHours("10:00", "11:00"), 1);
    assert.equal(durationHours("14:00", "16:30"), 2.5);
    assert.equal(durationHours("18:00", "20:00"), 2);
  });

  it("returns 0 for invalid or inverted times", () => {
    assert.equal(durationHours("nope", "11:00"), 0);
    assert.equal(durationHours("11:00", "10:00"), 0);
  });
});

describe("monthKey", () => {
  it("takes YYYY-MM from an ISO date", () => {
    assert.equal(monthKey("2026-09-15"), "2026-09");
  });
});

describe("aggregateRoomUsage (#51, #53)", () => {
  it("totals bookings, approved hours, and status counts for a 10+ fixture", () => {
    assert.ok(FIXTURE.length >= 10);

    const report = aggregateRoomUsage(FIXTURE, { from: "2026-09-01", to: "2026-09-30" }, [
      "seminar-201",
      "innovation",
      "lkd-aud",
      "atrium",
      "arch-mp-b",
      "lkd-confa",
    ]);

    assert.equal(report.from, "2026-09-01");
    assert.equal(report.to, "2026-09-30");
    assert.deepEqual(report.byStatus, {
      ...emptyStatusCounts(),
      pending: 2,
      approved: 5,
      rejected: 2,
      "needs-changes": 1,
    });

    const byId = Object.fromEntries(report.rooms.map((row) => [row.roomId, row]));

    assert.deepEqual(byId["seminar-201"]?.months, [
      { month: "2026-09", bookings: 3, approvedHours: 3 },
    ]);
    assert.deepEqual(byId["innovation"]?.months, [
      { month: "2026-09", bookings: 3, approvedHours: 2.5 },
    ]);
    assert.deepEqual(byId["lkd-aud"]?.months, [
      { month: "2026-09", bookings: 2, approvedHours: 2 },
    ]);
    assert.deepEqual(byId["atrium"]?.months, [{ month: "2026-09", bookings: 1, approvedHours: 2 }]);
    assert.deepEqual(byId["arch-mp-b"]?.months, [
      { month: "2026-09", bookings: 1, approvedHours: 0 },
    ]);
    assert.deepEqual(byId["lkd-confa"]?.months, []);

    // August atrium booking is outside the range.
    assert.equal(
      report.rooms.flatMap((row) => row.months).some((m) => m.month === "2026-08"),
      false,
    );
    // October seminar booking is outside the range.
    assert.equal(byId["seminar-201"]?.months.some((m) => m.month === "2026-10") ?? false, false);
  });

  it("keeps catalog order and appends unknown rooms last", () => {
    const report = aggregateRoomUsage(
      [
        {
          room: "mystery",
          date: "2026-09-01",
          startTime: "10:00",
          endTime: "11:00",
          status: "pending",
        },
        {
          room: "seminar-201",
          date: "2026-09-01",
          startTime: "12:00",
          endTime: "13:00",
          status: "pending",
        },
      ],
      { from: "2026-09-01", to: "2026-09-30" },
      ["seminar-201", "innovation"],
    );
    assert.deepEqual(
      report.rooms.map((row) => row.roomId),
      ["seminar-201", "innovation", "mystery"],
    );
  });
});
