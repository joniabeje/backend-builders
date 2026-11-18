// Firestore document shapes for rooms, reservations and their status history (#54),
// users and sessions (#60), and the mapping to the domain types the rest of the app
// uses. See docs/ARCHITECTURE.md.
import type { Role } from "@/domain/auth";
import { isRequestStatus, type EventRequest, type StatusChange } from "@/domain/reservation";

export const COLLECTIONS = {
  rooms: "rooms",
  reservations: "reservations",
  /** Subcollection of each reservation: one document per status change. */
  history: "history",
  users: "users",
  sessions: "sessions",
  /** Singleton docs such as the reservation id counter (#65). */
  counters: "counters",
} as const;

/** `counters/reservations` — last issued REQ-<n> number for transactional creates (#65). */
export const RESERVATION_COUNTER_ID = "reservations";

export type ReservationCounterDoc = {
  lastNumber: number;
};

/** `rooms/{roomId}`. The id is the stable room id, e.g. "seminar-201". */
export type RoomDoc = {
  name: string;
  building: string;
  floor: string;
  capacity: number;
  features: string[];
};

/**
 * `reservations/{reservationId}`. Everything on EventRequest except the id (the document
 * id) and history (the subcollection). `requesterId` links to the signed-in user once
 * accounts exist (#14); seeded and pre-sign-in requests have null.
 */
export type ReservationDoc = Omit<EventRequest, "id" | "history"> & {
  requesterId: string | null;
};

/** `reservations/{reservationId}/history/{entryId}`. Ordered by `at`, an ISO timestamp. */
export type HistoryDoc = StatusChange;

export class CorruptDocumentError extends Error {
  constructor(path: string, problem: string) {
    super(`Firestore document ${path} is invalid: ${problem}`);
    this.name = "CorruptDocumentError";
  }
}

export function toReservationDoc(
  request: EventRequest,
  requesterId: string | null = null,
): ReservationDoc {
  const { id: _id, history: _history, ...fields } = request;
  return { ...fields, requesterId };
}

/**
 * Rebuilds the domain reservation from its document and history entries. History may
 * arrive in any order; it comes back oldest first, as the UI expects.
 */
export function fromReservationDoc(
  id: string,
  doc: ReservationDoc,
  history: readonly HistoryDoc[] = [],
): EventRequest {
  if (!isRequestStatus(doc.status)) {
    throw new CorruptDocumentError(`reservations/${id}`, `unknown status "${String(doc.status)}"`);
  }
  for (const entry of history) {
    if (!isRequestStatus(entry.from) || !isRequestStatus(entry.to)) {
      throw new CorruptDocumentError(`reservations/${id}/history`, "unknown status in an entry");
    }
  }
  const { requesterId: _requesterId, ...fields } = doc;
  return {
    ...fields,
    id,
    history: [...history].sort((a, b) => a.at.localeCompare(b.at)),
  };
}

/** The room fields stored in Firestore. Images stay in the client bundle, keyed by id. */
export function toRoomDoc(room: RoomDoc & { id: string }): RoomDoc {
  const { name, building, floor, capacity, features } = room;
  return { name, building, floor, capacity, features: [...features] };
}

/** `users/{userId}`. Password material never leaves the server. */
export type UserDoc = {
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
  passwordSalt: string;
};

/** `sessions/{sessionId}`. `expiresAt` is an ISO-8601 timestamp. */
export type SessionDoc = {
  userId: string;
  role: Role;
  expiresAt: string;
};
