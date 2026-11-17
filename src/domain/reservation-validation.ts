// Reservation validation rules (TD-03 in DEBT_AND_RISK.md).
//
// This module must stay framework-free: no React, no asset imports, no mock data.
// Callers pass the room catalog in, so the same rules can later run on the server
// against rooms loaded from the API instead of `src/lib/rooms.ts`.
import type { Room } from "@/lib/rooms";
import { isAfterHours, scoreRisk, type RiskAssessment, type RiskFactorCode } from "./risk";
import { describeConflicts, findConflicts, type BookedSlot } from "./room-availability";
import { parseTimeOfDay } from "./time-of-day";

export { isAfterHours, parseTimeOfDay };

/** Raw values from the reservation form. Inputs are strings, toggles are booleans. */
export type ReservationForm = {
  title: string;
  organization: string;
  advisor: string;
  advisorEmail: string;
  /** The requester confirms their faculty advisor has approved the event. */
  advisorApproved: boolean;
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
  /** Room features the event needs, e.g. "Projector" (#4). */
  requiredFeatures: readonly string[];
};

/** The only room fields the rules need, so callers are not tied to the UI catalog shape. */
export type RoomCapacity = Pick<Room, "id" | "name" | "capacity"> & {
  /** Optional so callers that only check capacity can omit it; then no feature warning is raised. */
  features?: readonly string[];
};

export type IssueSeverity = "error" | "warn";

export type IssueCode =
  | "advisor-approval-missing"
  | "advisor-email-invalid"
  | "attendance-invalid"
  | "attendance-min"
  | "room-unknown"
  | "room-capacity"
  | "room-conflict"
  | "room-missing-features"
  | "time-invalid"
  | "time-order"
  | "after-hours"
  | "security-review"
  | "food-service"
  | "risk-review";

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
  /**
   * Risk from the shared rules in ./risk. Until times and attendance are filled in it is
   * a lower bound, since every risk factor only adds points.
   */
  risk: RiskAssessment;
  issues: readonly ValidationIssue[];
  requiredFieldsFilled: boolean;
  canSubmit: boolean;
};

/**
 * Requester-facing warnings for risk factors, keyed by the factor that raises them and
 * listed in display order. The rules themselves (thresholds, after-hours window) live
 * only in ./risk.
 */
const RISK_WARNINGS: Partial<Record<RiskFactorCode, { code: IssueCode; message: string }>> = {
  "after-hours": {
    code: "after-hours",
    message: "After-hours event — supervisor confirmation required.",
  },
  "security-staffing": {
    code: "security-review",
    message: "External guests + large attendance — security may be required.",
  },
  "food-service": {
    code: "food-service",
    message: "Food service — custodial pre/post event scheduling will be triggered.",
  },
};

const RISK_REVIEW_WARNING: ValidationIssue = {
  code: "risk-review",
  severity: "warn",
  message: "High-risk event — the Dean's Office will give this request additional review.",
};

const ADVISOR_APPROVAL_MISSING: ValidationIssue = {
  code: "advisor-approval-missing",
  severity: "error",
  message: "Confirm that your faculty advisor has approved this event.",
};

const REQUIRED_FIELDS = [
  "title",
  "organization",
  "advisor",
  "advisorEmail",
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

function hasRequiredFields(form: ReservationForm): boolean {
  return REQUIRED_FIELDS.every((field) => form[field].trim() !== "");
}

/**
 * One "@", no spaces, and a dot in the domain. Deliberately loose: the goal is to catch
 * typos, not to decide which addresses exist. Not limited to howard.edu, since some
 * advisors are external partners.
 */
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_FORMAT.test(value.trim());
}

function advisorEmailIssues(email: string): ValidationIssue[] {
  if (email.trim() === "" || isValidEmail(email)) return [];
  return [
    {
      code: "advisor-email-invalid",
      severity: "error",
      message: "Enter the advisor's email address, like name@howard.edu.",
    },
  ];
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

function featureIssues(
  roomId: string,
  required: readonly string[],
  rooms: readonly RoomCapacity[],
): ValidationIssue[] {
  const room = rooms.find((candidate) => candidate.id === roomId);
  if (!room?.features || required.length === 0) return [];
  const missing = required.filter((feature) => !room.features?.includes(feature));
  if (missing.length === 0) return [];
  return [
    {
      code: "room-missing-features",
      severity: "warn",
      message: `${room.name} does not list ${missing.join(", ")}. Choose a recommended room or arrange it separately.`,
    },
  ];
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
    ...advisorEmailIssues(form.advisorEmail),
    ...attendanceIssues(form.attendance, parsedAttendance),
    ...roomIssues(form.room, attendance, rooms),
    ...conflictIssues(form, rooms, reservations),
    ...featureIssues(form.room, form.requiredFeatures, rooms),
  ];

  let afterHours = false;
  if (form.startTime.trim() !== "" && form.endTime.trim() !== "") {
    const start = parseTimeOfDay(form.startTime);
    const end = parseTimeOfDay(form.endTime);
    issues.push(...timeIssues(start, end));
    afterHours = start !== null && end !== null && isAfterHours(start, end);
  }

  const risk = scoreRisk({
    attendance,
    externalGuests: form.externalGuests,
    hasFood: form.hasFood,
    afterHours,
  });
  const raised = new Set(risk.factors.map((factor) => factor.code));
  for (const [factorCode, warning] of Object.entries(RISK_WARNINGS)) {
    if (raised.has(factorCode as RiskFactorCode)) issues.push({ ...warning, severity: "warn" });
  }
  if (risk.requiresReview) issues.push(RISK_REVIEW_WARNING);

  const requiredFieldsFilled = hasRequiredFields(form);
  // Raised only once everything else is filled in, so an empty form still starts clean.
  if (requiredFieldsFilled && !form.advisorApproved) issues.push(ADVISOR_APPROVAL_MISSING);
  const hasErrors = issues.some((issue) => issue.severity === "error");

  return {
    attendance,
    isAfterHours: afterHours,
    risk,
    issues,
    requiredFieldsFilled,
    canSubmit: requiredFieldsFilled && !hasErrors,
  };
}
