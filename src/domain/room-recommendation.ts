// Room recommendation engine (issue #4).
//
// Framework-free like room-availability.ts: callers pass the room catalog and the
// existing reservations in. Filters run in the order the backlog specifies:
// availability (#3), then required features, then ranking by capacity fit.
import { findConflicts, isCompleteSlot, type BookedSlot } from "./room-availability";

/** The room fields recommendations need, so callers are not tied to the UI catalog shape. */
export type RecommendableRoom = {
  id: string;
  name: string;
  capacity: number;
  features: readonly string[];
};

export type RecommendationRequest = {
  attendance: number;
  /** "YYYY-MM-DD"; with the times below, enables the availability filter. */
  date: string;
  startTime: string;
  endTime: string;
  requiredFeatures: readonly string[];
  /** The room the requester has selected, or "" when none. */
  preferredRoomId: string;
};

export type UnsuitableReason = "booked" | "too-small" | "missing-features";

export type PreferredRoomProblem<R, B> = {
  room: R;
  reasons: UnsuitableReason[];
  conflicts: B[];
  missingFeatures: string[];
};

export type RoomRecommendationResult<R, B> = {
  /** Up to MAX_RECOMMENDATIONS rooms, best capacity fit first. Never includes the preferred room when it is unsuitable. */
  rooms: R[];
  /** Set when the preferred room cannot host the event, so the UI can say why. */
  preferred: PreferredRoomProblem<R, B> | null;
  /** False until date and times are complete; rooms are then not filtered by bookings. */
  availabilityChecked: boolean;
};

export const RECOMMENDATION_POLICY = {
  maxRecommendations: 3,
  /** Rooms more than this many times the attendance are only suggested when nothing smaller fits. */
  oversizeFactor: 3,
  /** Attendance above this is treated as a typo, not a real event. */
  maxReasonableAttendance: 5000,
} as const;

function isUsableAttendance(attendance: number): boolean {
  return (
    Number.isFinite(attendance) &&
    attendance >= 1 &&
    attendance <= RECOMMENDATION_POLICY.maxReasonableAttendance
  );
}

function missingFeatures(room: RecommendableRoom, required: readonly string[]): string[] {
  return required.filter((feature) => !room.features.includes(feature));
}

/**
 * Recommends rooms for an event. A room qualifies when it has no conflicting booking
 * for the requested slot, has every required feature, and fits the attendance.
 * Qualifying rooms are ranked smallest-that-fits first; oversized rooms are used
 * only when no room within RECOMMENDATION_POLICY.oversizeFactor fits.
 */
export function recommendRooms<R extends RecommendableRoom, B extends BookedSlot>(
  request: RecommendationRequest,
  rooms: readonly R[],
  reservations: readonly B[],
): RoomRecommendationResult<R, B> {
  const { date, startTime, endTime, requiredFeatures, preferredRoomId } = request;
  const availabilityChecked = isCompleteSlot({ date, startTime, endTime });
  const attendance = isUsableAttendance(request.attendance) ? Math.floor(request.attendance) : 0;

  const assess = (room: R) => {
    const conflicts = availabilityChecked
      ? findConflicts({ roomId: room.id, date, startTime, endTime }, reservations)
      : [];
    const missing = missingFeatures(room, requiredFeatures);
    const reasons: UnsuitableReason[] = [];
    if (conflicts.length > 0) reasons.push("booked");
    if (attendance > 0 && room.capacity < attendance) reasons.push("too-small");
    if (missing.length > 0) reasons.push("missing-features");
    return { room, reasons, conflicts, missingFeatures: missing };
  };

  const preferredRoom = rooms.find((room) => room.id === preferredRoomId);
  const preferredAssessment = preferredRoom ? assess(preferredRoom) : null;
  const preferred =
    preferredAssessment && preferredAssessment.reasons.length > 0 ? preferredAssessment : null;

  if (attendance === 0) return { rooms: [], preferred, availabilityChecked };

  const qualifying = rooms
    .filter((room) => assess(room).reasons.length === 0)
    .sort((a, b) => a.capacity - b.capacity || a.name.localeCompare(b.name));
  const withinSize = qualifying.filter(
    (room) => room.capacity <= attendance * RECOMMENDATION_POLICY.oversizeFactor,
  );
  const ranked = withinSize.length > 0 ? withinSize : qualifying;

  return {
    rooms: ranked.slice(0, RECOMMENDATION_POLICY.maxRecommendations),
    preferred,
    availabilityChecked,
  };
}
