// Reservation validation rules (TD-03 in DEBT_AND_RISK.md).
//
// This module must stay framework-free: no React, no asset imports, no mock data.
// Callers pass the room catalog in, so the same rules can later run on the server
// against rooms loaded from the API instead of `src/lib/rooms.ts`.
import type { Room } from "@/lib/rooms";
import { describeConflicts, findConflicts, type BookedSlot } from "./room-availability";
import { parseTimeOfDay } from "./time-of-day";

export { parseTimeOfDay };

/** Raw values from the reservation form. Inputs are strings, toggles are booleans. */
export type ReservationForm = {
  title: string;
  organization: string;
  advisor: string;
  /** "YYYY-MM-DD", as produced by <input type="date">. */
  date: string;
  /** "HH:mm" (24h), as produced by <input type="time">. */
  startTime: string;
  /** "HH:mm" (24h), as produced by <input type="time">. */
  endTime: string;
  attendance: string;
  purpose: string;
  /** A `Room.id`, or "" when nothing is selected. */
  room: string;
  hasFood: boolean;
  externalGuests: boolean;
  itNeeds: boolean;
};

/** The only room fields the rules need, so callers are not tied to the UI catalog shape. */
export type RoomCapacity = Pick<Room, "id" | "name" | "capacity">;

export type IssueSeverity = "error" | "warn";

export type IssueCode =
  | "attendance-invalid"
  | "attendance-min"
  | "room-unknown"
  | "room-capacity"
  | "room-conflict"
  | "time-invalid"
  | "time-order"
  | "after-hours"
  | "security-review"
  | "food-service";

export type ValidationIssue = {
  /** Unique within one validation result, so it is safe to use as a React key. */
  code: IssueCode;
  severity: IssueSeverity;
  message: string;
};

export type ReservationValidation = {
  /** Parsed attendance, or 0 when the field is empty or invalid. */
  attendance: number;
  isAfterHours: boolean;
  issues: readonly ValidationIssue[];
  requiredFieldsFilled: boolean;
  canSubmit: boolean;
};

/**
 * CEA policy thresholds. Values preserve the prototype's behavior; confirm with the
 * Dean's Office before changing them.
 */
export const RESERVATION_POLICY = {
  /** Events starting or ending before this time are after-hours. */
  dayStartMinutes: 8 * 60,
  /** Events starting at or after this time are after-hours. */
  lateStartMinutes: 18 * 60,
  /** Events ending at or after this time are after-hours. */
  lateEndMinutes: 20 * 60,
  /** Attendance at which external guests trigger a security review warning. */
  securityReviewAttendance: 50,
} as const;

const REQUIRED_FIELDS = [
  "title",
  "organization",
  "advisor",
  "date",
  "startTime",
  "endTime",
  "attendance",
  "purpose",
  "room",
] as const satisfies readonly (keyof ReservationForm)[];

const WHOLE_NUMBER = /^-?\d+$/;

/** The attendance as a whole number, or null if the value is not one. */
export function parseAttendance(value: string): number | null {
  const trimmed = value.trim();
  if (!WHOLE_NUMBER.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function isAfterHours(startMinutes: number, endMinutes: number): boolean {
  const { dayStartMinutes, lateStartMinutes, lateEndMinutes } = RESERVATION_POLICY;
  return (
    startMinutes < dayStartMinutes ||
    startMinutes >= lateStartMinutes ||
    endMinutes < dayStartMinutes ||
    endMinutes >= lateEndMinutes
  );
}

function hasRequiredFields(form: ReservationForm): boolean {
  return REQUIRED_FIELDS.every((field) => form[field].trim() !== "");
}

function attendanceIssues(raw: string, attendance: number | null): ValidationIssue[] {
  if (raw.trim() === "") return [];
  if (attendance === null) {
    return [
      {
        code: "attendance-invalid",
        severity: "error",
        message: "Attendance must be a whole number.",
      },
    ];
  }
  if (attendance < 1) {
    return [
      { code: "attendance-min", severity: "error", message: "Attendance must be at least 1." },
    ];
  }
  return [];
}

function roomIssues(
  roomId: string,
  attendance: number,
  rooms: readonly RoomCapacity[],
): ValidationIssue[] {
  if (roomId === "") return [];
  const room = rooms.find((candidate) => candidate.id === roomId);
  if (!room) {
    return [
      {
        code: "room-unknown",
        severity: "error",
        message: "The selected room is not in the room catalog. Choose another room.",
      },
    ];
  }
  if (attendance > room.capacity) {
    return [
      {
        code: "room-capacity",
        severity: "error",
        message: `Attendance of ${attendance} exceeds ${room.name} capacity of ${room.capacity}.`,
      },
    ];
  }
  return [];
}

function timeIssues(start: number | null, end: number | null): ValidationIssue[] {
  if (start === null || end === null) {
    return [
      {
        code: "time-invalid",
        severity: "error",
        message: "Start and end must be valid times (HH:mm).",
      },
    ];
  }
  if (start >= end) {
    return [
      { code: "time-order", severity: "error", message: "End time must be after start time." },
    ];
  }
  return [];
}

function conflictIssues(
  form: ReservationForm,
  rooms: readonly RoomCapacity[],
  reservations: readonly BookedSlot[],
): ValidationIssue[] {
  const conflicts = findConflicts(
    { roomId: form.room, date: form.date, startTime: form.startTime, endTime: form.endTime },
    reservations,
  );
  if (conflicts.length === 0) return [];
  const roomName = rooms.find((room) => room.id === form.room)?.name ?? form.room;
  return [
    {
      code: "room-conflict",
      severity: "error",
      message: `${roomName} is already booked on ${form.date} at ${describeConflicts(conflicts)}. Choose another room or time.`,
    },
  ];
}

/**
 * Checks a reservation form against CEA booking rules.
 *
 * Errors block submission; warnings tell the requester which offices will be involved.
 * Rules only run for fields the user has filled in, so an empty form has no issues.
 * `reservations` are the existing bookings used for the double-booking check (#3).
 */
export function validateReservation(
  form: ReservationForm,
  rooms: readonly RoomCapacity[],
  reservations: readonly BookedSlot[] = [],
): ReservationValidation {
  const parsedAttendance = parseAttendance(form.attendance);
  const attendance = parsedAttendance ?? 0;
  const issues: ValidationIssue[] = [
    ...attendanceIssues(form.attendance, parsedAttendance),
    ...roomIssues(form.room, attendance, rooms),
    ...conflictIssues(form, rooms, reservations),
  ];

  let afterHours = false;
  if (form.startTime.trim() !== "" && form.endTime.trim() !== "") {
    const start = parseTimeOfDay(form.startTime);
    const end = parseTimeOfDay(form.endTime);
    issues.push(...timeIssues(start, end));
    afterHours = start !== null && end !== null && isAfterHours(start, end);
  }

  if (afterHours) {
    issues.push({
      code: "after-hours",
      severity: "warn",
      message: "After-hours event — supervisor confirmation required.",
    });
  }
  if (form.externalGuests && attendance >= RESERVATION_POLICY.securityReviewAttendance) {
    issues.push({
      code: "security-review",
      severity: "warn",
      message: "External guests + large attendance — security may be required.",
    });
  }
  if (form.hasFood) {
    issues.push({
      code: "food-service",
      severity: "warn",
      message: "Food service — custodial pre/post event scheduling will be triggered.",
    });
  }

  const requiredFieldsFilled = hasRequiredFields(form);
  const hasErrors = issues.some((issue) => issue.severity === "error");

  return {
    attendance,
    isAfterHours: afterHours,
    issues,
    requiredFieldsFilled,
    canSubmit: requiredFieldsFilled && !hasErrors,
  };
}
