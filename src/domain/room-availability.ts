// Room availability and double-booking rules (issue #3, TD-06 in DEBT_AND_RISK.md).
//
// Framework-free like reservation-validation.ts: callers pass the existing
// reservations in, so the same check can run on the server once the reservation
// API exists (#13) and reject a conflicting POST with a 409.
import type { EventRequest, RequestStatus } from "./reservation";
import { parseTimeOfDay } from "./time-of-day";

/** The reservation fields a conflict check needs. Full EventRequests are accepted. */
export type BookedSlot = Pick<
  EventRequest,
  "id" | "room" | "date" | "startTime" | "endTime" | "status"
>;

/** The slot being requested. Times are "HH:mm" strings straight from the form. */
export type RequestedSlot = {
  roomId: string;
  /** "YYYY-MM-DD". */
  date: string;
  startTime: string;
  endTime: string;
};

/**
 * Statuses that hold a room. A rejected request releases its slot; a request sent
 * back for changes still holds it until the requester withdraws or an admin rejects.
 */
export const ROOM_HOLDING_STATUSES: readonly RequestStatus[] = [
  "pending",
  "approved",
  "needs-changes",
];

/**
 * Half-open overlap check on minutes since midnight: [aStart, aEnd) and [bStart, bEnd).
 * Back-to-back bookings (one ends 14:00, the next starts 14:00) do not overlap.
 */
export function timeRangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Parsed start and end minutes, or null when either time is missing, invalid, or out of order. */
function parseRange(startTime: string, endTime: string): { start: number; end: number } | null {
  const start = parseTimeOfDay(startTime);
  const end = parseTimeOfDay(endTime);
  if (start === null || end === null || start >= end) return null;
  return { start, end };
}

/** True when the slot has a date and a valid, ordered time range, so availability can be checked. */
export function isCompleteSlot(slot: Omit<RequestedSlot, "roomId">): boolean {
  return slot.date.trim() !== "" && parseRange(slot.startTime, slot.endTime) !== null;
}

/**
 * Existing reservations that would double-book the requested slot: same room, same
 * date, overlapping times, and a status that holds the room.
 *
 * Returns [] for an incomplete or invalid slot; time validation reports that case.
 * `excludeId` skips the reservation being edited so it never conflicts with itself.
 */
export function findConflicts<T extends BookedSlot>(
  slot: RequestedSlot,
  reservations: readonly T[],
  options: { excludeId?: string } = {},
): T[] {
  const requested = parseRange(slot.startTime, slot.endTime);
  if (!requested || slot.roomId === "" || slot.date.trim() === "") return [];

  return reservations.filter((reservation) => {
    if (reservation.id === options.excludeId) return false;
    if (reservation.room !== slot.roomId || reservation.date !== slot.date) return false;
    if (!ROOM_HOLDING_STATUSES.includes(reservation.status)) return false;
    const existing = parseRange(reservation.startTime, reservation.endTime);
    // A stored reservation with unreadable times cannot be proven free, so it blocks the room.
    if (!existing) return true;
    return timeRangesOverlap(requested.start, requested.end, existing.start, existing.end);
  });
}

export type RoomAvailability<T extends BookedSlot = BookedSlot> = {
  roomId: string;
  available: boolean;
  conflicts: T[];
};

/**
 * Availability of every room for one date and time range. When the slot is
 * incomplete, every room is reported available because nothing can be ruled out yet;
 * use isCompleteSlot to tell the two cases apart in the UI.
 */
export function getRoomAvailability<T extends BookedSlot>(
  roomIds: readonly string[],
  slot: Omit<RequestedSlot, "roomId">,
  reservations: readonly T[],
): Map<string, RoomAvailability<T>> {
  return new Map(
    roomIds.map((roomId) => {
      const conflicts = findConflicts({ ...slot, roomId }, reservations);
      return [roomId, { roomId, available: conflicts.length === 0, conflicts }];
    }),
  );
}

/**
 * The room-holding reservation in progress at `minutes` past midnight on `date`, if any.
 * Starts are inclusive and ends exclusive, matching timeRangesOverlap.
 */
export function findReservationInProgress<T extends BookedSlot>(
  roomId: string,
  date: string,
  minutes: number,
  reservations: readonly T[],
): T | undefined {
  return reservations.find((reservation) => {
    if (reservation.room !== roomId || reservation.date !== date) return false;
    if (!ROOM_HOLDING_STATUSES.includes(reservation.status)) return false;
    const range = parseRange(reservation.startTime, reservation.endTime);
    return range !== null && range.start <= minutes && minutes < range.end;
  });
}

/** "14:00–16:00 (REQ-1040)" style summary for conflict messages. */
export function describeConflicts(conflicts: readonly BookedSlot[]): string {
  return conflicts
    .map((conflict) => `${conflict.startTime}–${conflict.endTime} (${conflict.id})`)
    .join(", ");
}
