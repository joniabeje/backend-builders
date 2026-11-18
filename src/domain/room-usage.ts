// Room usage and status totals for admin analytics (#51 / #53).
import { countByStatus } from "./reservation-summary";
import { REQUEST_STATUSES, type EventRequest, type RequestStatus } from "./reservation";
import { parseTimeOfDay } from "./time-of-day";

export type RoomUsageMonth = {
  /** Calendar month of the event date (`YYYY-MM`). */
  month: string;
  /** Reservations in this room/month (every status). */
  bookings: number;
  /** Sum of durations for approved bookings only, in hours. */
  approvedHours: number;
};

export type RoomUsageRow = {
  roomId: string;
  months: readonly RoomUsageMonth[];
};

export type RoomUsageReport = {
  from: string;
  to: string;
  byStatus: Record<RequestStatus, number>;
  rooms: readonly RoomUsageRow[];
};

/** Hours between HH:mm times on the same day; 0 when times are missing or inverted. */
export function durationHours(startTime: string, endTime: string): number {
  const start = parseTimeOfDay(startTime);
  const end = parseTimeOfDay(endTime);
  if (start === null || end === null || end <= start) return 0;
  return (end - start) / 60;
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

type UsageInput = Pick<EventRequest, "room" | "date" | "startTime" | "endTime" | "status">;

/**
 * Aggregates booking counts and approved hours per room per month, plus status
 * counts, for reservations already limited to `[from, to]` on event date (#51).
 * `roomIds` sets the row order (typically the CEA catalog); empty months are omitted.
 */
export function aggregateRoomUsage(
  reservations: readonly UsageInput[],
  range: { from: string; to: string },
  roomIds: readonly string[],
): RoomUsageReport {
  const byRoom = new Map<string, Map<string, { bookings: number; approvedHours: number }>>();
  for (const roomId of roomIds) byRoom.set(roomId, new Map());

  for (const reservation of reservations) {
    if (reservation.date < range.from || reservation.date > range.to) continue;
    let months = byRoom.get(reservation.room);
    if (!months) {
      months = new Map();
      byRoom.set(reservation.room, months);
    }
    const month = monthKey(reservation.date);
    const current = months.get(month) ?? { bookings: 0, approvedHours: 0 };
    current.bookings += 1;
    if (reservation.status === "approved") {
      current.approvedHours += durationHours(reservation.startTime, reservation.endTime);
    }
    months.set(month, current);
  }

  const rooms: RoomUsageRow[] = [];
  const orderedIds = [
    ...roomIds,
    ...[...byRoom.keys()].filter((id) => !roomIds.includes(id)).sort(),
  ];
  for (const roomId of orderedIds) {
    const months = byRoom.get(roomId);
    if (!months) continue;
    const rows = [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, totals]) => ({
        month,
        bookings: totals.bookings,
        approvedHours: totals.approvedHours,
      }));
    rooms.push({ roomId, months: rows });
  }

  return {
    from: range.from,
    to: range.to,
    byStatus: countByStatus(
      reservations.filter((row) => row.date >= range.from && row.date <= range.to),
    ),
    rooms,
  };
}

/** Empty status totals — handy for tests and OpenAPI examples. */
export function emptyStatusCounts(): Record<RequestStatus, number> {
  return Object.fromEntries(REQUEST_STATUSES.map((status) => [status, 0])) as Record<
    RequestStatus,
    number
  >;
}
