export type RoomCapacity = {
  id: string;
  name: string;
  capacity: number;
};

/** The fields the reserve form uses for policy. Service toggles that do not affect rules stay in the page. */
export type ReservationDraft = {
  title: string;
  organization: string;
  advisor: string;
  date: string;
  startTime: string;
  endTime: string;
  attendance: string;
  purpose: string;
  room: string;
  hasFood: boolean;
  externalGuests: boolean;
};

export type ReservationIssue = {
  type: "error" | "warn";
  msg: string;
};

export type ReservationReview = {
  attendance: number;
  isAfterHours: boolean;
  issues: ReservationIssue[];
  requiredOk: boolean;
  canSubmit: boolean;
};

/**
 * Hour bounds copied from the prototype, not a single business-hours window.
 * A start at 18:00 is after hours. An end time is after hours only at 20:00 or later.
 * An event that runs 17:00–19:00 is still a normal daytime request.
 */
const AFTER_HOURS_START_HOUR = 18;
const AFTER_HOURS_END_HOUR = 20;
const EARLY_MORNING_HOUR = 8;
const SECURITY_REVIEW_ATTENDANCE = 50;

export function parseAttendance(raw: string): number {
  return parseInt(raw, 10) || 0;
}

export function isAfterHoursEvent(startTime: string, endTime: string): boolean {
  if (!startTime || !endTime) return false;
  const startHour = parseInt(startTime.split(":")[0], 10);
  const endHour = parseInt(endTime.split(":")[0], 10);
  return (
    startHour >= AFTER_HOURS_START_HOUR ||
    startHour < EARLY_MORNING_HOUR ||
    endHour >= AFTER_HOURS_END_HOUR ||
    endHour < EARLY_MORNING_HOUR
  );
}

/**
 * Same checks the reserve page used to build inline.
 * Errors block submit. Warnings stay visible and still allow submit.
 */
export function reviewReservation(
  draft: ReservationDraft,
  rooms: readonly RoomCapacity[],
): ReservationReview {
  const attendance = parseAttendance(draft.attendance);
  const isAfterHours = isAfterHoursEvent(draft.startTime, draft.endTime);
  const issues: ReservationIssue[] = [];

  if (draft.attendance && attendance < 1) {
    issues.push({ type: "error", msg: "Attendance must be at least 1." });
  }

  if (draft.room) {
    const room = rooms.find((candidate) => candidate.id === draft.room);
    if (room && attendance > room.capacity) {
      issues.push({
        type: "error",
        msg: `${room.name} capacity is ${room.capacity} — exceeds attendance.`,
      });
    }
  }

  if (draft.startTime && draft.endTime && draft.startTime >= draft.endTime) {
    issues.push({ type: "error", msg: "End time must be after start time." });
  }

  if (isAfterHours) {
    issues.push({
      type: "warn",
      msg: "After-hours event — supervisor confirmation required.",
    });
  }

  if (draft.externalGuests && attendance >= SECURITY_REVIEW_ATTENDANCE) {
    issues.push({
      type: "warn",
      msg: "External guests + large attendance — security may be required.",
    });
  }

  if (draft.hasFood) {
    issues.push({
      type: "warn",
      msg: "Food service — custodial pre/post event scheduling will be triggered.",
    });
  }

  const requiredOk = Boolean(
    draft.title &&
    draft.organization &&
    draft.advisor &&
    draft.date &&
    draft.startTime &&
    draft.endTime &&
    draft.attendance &&
    draft.purpose &&
    draft.room,
  );

  return {
    attendance,
    isAfterHours,
    issues,
    requiredOk,
    canSubmit: requiredOk && !issues.some((issue) => issue.type === "error"),
  };
}
