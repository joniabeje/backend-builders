import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isAfterHours,
  parseAttendance,
  parseTimeOfDay,
  validateReservation,
  type IssueCode,
  type ReservationForm,
  type RoomCapacity,
} from "./reservation-validation.ts";
import type { BookedSlot } from "./room-availability.ts";

const ROOMS: RoomCapacity[] = [
  { id: "seminar-201", name: "Seminar Room 201", capacity: 25 },
  { id: "lkd-aud", name: "Downing Hall Auditorium", capacity: 250 },
];

const VALID_FORM: ReservationForm = {
  title: "NSBE General Body Meeting",
  organization: "NSBE — Howard Chapter",
  advisor: "Dr. Williams",
  date: "2026-11-04",
  startTime: "12:00",
  endTime: "13:00",
  attendance: "20",
  purpose: "Monthly chapter meeting",
  room: "seminar-201",
  hasFood: false,
  externalGuests: false,
  itNeeds: false,
  requiredFeatures: [],
};

const EMPTY_FORM: ReservationForm = {
  title: "",
  organization: "",
  advisor: "",
  date: "",
  startTime: "",
  endTime: "",
  attendance: "",
  purpose: "",
  room: "",
  hasFood: false,
  externalGuests: false,
  itNeeds: false,
  requiredFeatures: [],
};

function codesFor(overrides: Partial<ReservationForm>): IssueCode[] {
  return validateReservation({ ...VALID_FORM, ...overrides }, ROOMS).issues.map((i) => i.code);
}

describe("parseAttendance", () => {
  it("accepts whole numbers, including surrounding whitespace", () => {
    assert.equal(parseAttendance("75"), 75);
    assert.equal(parseAttendance(" 75 "), 75);
    assert.equal(parseAttendance("-5"), -5);
  });

  it("rejects values parseInt would silently truncate", () => {
    assert.equal(parseAttendance("1.5"), null);
    assert.equal(parseAttendance("12abc"), null);
    assert.equal(parseAttendance("1e3"), null);
    assert.equal(parseAttendance(""), null);
    assert.equal(parseAttendance("99999999999999999999"), null);
  });
});

describe("parseTimeOfDay", () => {
  it("returns minutes since midnight for HH:mm and HH:mm:ss", () => {
    assert.equal(parseTimeOfDay("00:00"), 0);
    assert.equal(parseTimeOfDay("18:30"), 18 * 60 + 30);
    assert.equal(parseTimeOfDay("23:59:59"), 23 * 60 + 59);
  });

  it("returns null for malformed or out-of-range times", () => {
    for (const bad of ["", "7:00", "24:00", "12:60", "noon", "12-30"]) {
      assert.equal(parseTimeOfDay(bad), null, bad);
    }
  });
});

describe("isAfterHours (matches the prototype's hour-based rule)", () => {
  const at = (hhmm: string) => parseTimeOfDay(hhmm) ?? assert.fail(hhmm);

  it("is false for a normal daytime event", () => {
    assert.equal(isAfterHours(at("08:00"), at("17:59")), false);
    assert.equal(isAfterHours(at("17:59"), at("19:59")), false);
  });

  it("is true for early starts, late starts, and late ends", () => {
    assert.equal(isAfterHours(at("07:59"), at("10:00")), true);
    assert.equal(isAfterHours(at("18:00"), at("19:00")), true);
    assert.equal(isAfterHours(at("12:00"), at("20:00")), true);
  });
});

describe("validateReservation", () => {
  it("returns no issues and allows submission for a valid form", () => {
    const result = validateReservation(VALID_FORM, ROOMS);
    assert.deepEqual(result.issues, []);
    assert.equal(result.requiredFieldsFilled, true);
    assert.equal(result.canSubmit, true);
    assert.equal(result.attendance, 20);
  });

  it("reports nothing for an empty form but blocks submission", () => {
    const result = validateReservation(EMPTY_FORM, ROOMS);
    assert.deepEqual(result.issues, []);
    assert.equal(result.requiredFieldsFilled, false);
    assert.equal(result.canSubmit, false);
  });

  it("treats whitespace-only required fields as missing", () => {
    const result = validateReservation({ ...VALID_FORM, title: "   " }, ROOMS);
    assert.equal(result.requiredFieldsFilled, false);
    assert.equal(result.canSubmit, false);
  });

  it("blocks attendance below 1", () => {
    assert.deepEqual(codesFor({ attendance: "0" }), ["attendance-min"]);
  });

  it("blocks non-integer attendance instead of truncating it", () => {
    const result = validateReservation({ ...VALID_FORM, attendance: "1.5" }, ROOMS);
    assert.deepEqual(
      result.issues.map((i) => i.code),
      ["attendance-invalid"],
    );
    assert.equal(result.attendance, 0);
    assert.equal(result.canSubmit, false);
  });

  it("blocks attendance over room capacity with a readable message", () => {
    const result = validateReservation({ ...VALID_FORM, attendance: "30" }, ROOMS);
    assert.deepEqual(result.issues, [
      {
        code: "room-capacity",
        severity: "error",
        message: "Attendance of 30 exceeds Seminar Room 201 capacity of 25.",
      },
    ]);
    assert.equal(result.canSubmit, false);
  });

  it("blocks a room id that is not in the catalog instead of skipping the check", () => {
    assert.deepEqual(codesFor({ room: "mackey-atrium" }), ["room-unknown"]);
  });

  it("blocks an end time that is not after the start time", () => {
    assert.deepEqual(codesFor({ startTime: "13:00", endTime: "13:00" }), ["time-order"]);
    assert.deepEqual(codesFor({ startTime: "14:00", endTime: "13:00" }), ["time-order"]);
  });

  it("blocks malformed times", () => {
    assert.deepEqual(codesFor({ startTime: "25:00" }), ["time-invalid"]);
  });

  it("skips time checks until both times are entered", () => {
    assert.deepEqual(codesFor({ endTime: "" }), []);
  });

  it("warns but still allows submission for after-hours, security, and food", () => {
    const result = validateReservation(
      {
        ...VALID_FORM,
        room: "lkd-aud",
        attendance: "50",
        startTime: "18:00",
        endTime: "21:00",
        externalGuests: true,
        hasFood: true,
      },
      ROOMS,
    );
    assert.deepEqual(
      result.issues.map((i) => i.code),
      ["after-hours", "security-review", "food-service"],
    );
    assert.ok(result.issues.every((i) => i.severity === "warn"));
    assert.equal(result.isAfterHours, true);
    assert.equal(result.canSubmit, true);
  });

  it("does not raise the security warning below 50 attendees", () => {
    assert.deepEqual(codesFor({ externalGuests: true, attendance: "49", room: "lkd-aud" }), []);
  });
});

describe("validateReservation double-booking check", () => {
  const BOOKED: BookedSlot[] = [
    {
      id: "REQ-1040",
      room: "seminar-201",
      date: "2026-11-04",
      startTime: "12:30",
      endTime: "14:00",
      status: "approved",
    },
  ];
  const validate = (overrides: Partial<ReservationForm>) =>
    validateReservation({ ...VALID_FORM, ...overrides }, ROOMS, BOOKED);

  it("blocks a room that is already booked for an overlapping time", () => {
    const result = validate({});
    const conflict = result.issues.find((issue) => issue.code === "room-conflict");
    assert.equal(conflict?.severity, "error");
    assert.equal(
      conflict?.message,
      "Seminar Room 201 is already booked on 2026-11-04 at 12:30–14:00 (REQ-1040). Choose another room or time.",
    );
    assert.equal(result.canSubmit, false);
  });

  it("allows the same room right after the existing booking ends", () => {
    const result = validate({ startTime: "14:00", endTime: "15:00" });
    assert.deepEqual(result.issues, []);
    assert.equal(result.canSubmit, true);
  });

  it("allows another room or another date for the same time", () => {
    assert.equal(validate({ room: "lkd-aud" }).canSubmit, true);
    assert.equal(validate({ date: "2026-11-05" }).canSubmit, true);
  });

  it("skips the check when no reservations are passed, as before #3", () => {
    assert.equal(validateReservation(VALID_FORM, ROOMS).canSubmit, true);
  });
});

describe("validateReservation required features", () => {
  const WITH_FEATURES: RoomCapacity[] = [
    { id: "seminar-201", name: "Seminar Room 201", capacity: 25, features: ["Whiteboard"] },
  ];

  it("warns, without blocking, when the selected room lacks a required feature", () => {
    const result = validateReservation(
      { ...VALID_FORM, requiredFeatures: ["Projector", "Whiteboard"] },
      WITH_FEATURES,
    );
    assert.deepEqual(result.issues, [
      {
        code: "room-missing-features",
        severity: "warn",
        message:
          "Seminar Room 201 does not list Projector. Choose a recommended room or arrange it separately.",
      },
    ]);
    assert.equal(result.canSubmit, true);
  });

  it("raises nothing when the room has every required feature", () => {
    const form = { ...VALID_FORM, requiredFeatures: ["Whiteboard"] };
    assert.deepEqual(validateReservation(form, WITH_FEATURES).issues, []);
  });
});
