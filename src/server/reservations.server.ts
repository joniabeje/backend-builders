// Firestore-backed reservation and room reads/writes for the HTTP API (#55).
// Pages still use the in-memory repository until #57 switches them over.
import type { Firestore } from "firebase-admin/firestore";
import { UNVERIFIED_REQUESTER } from "@/data/in-memory-reservation-repository";
import {
  ReservationConflictError,
  ReservationNotFoundError,
  ReservationValidationError,
} from "@/data/reservation-repository";
import type { EventRequest, NewReservation } from "@/domain/reservation";
import {
  validateReservation,
  type ReservationForm,
  type RoomCapacity,
} from "@/domain/reservation-validation";
import { withRisk } from "@/domain/risk";
import {
  applyReviewDecision,
  isReviewDecision,
  type ReviewInput,
} from "@/domain/review-decision";
import { findConflicts } from "@/domain/room-availability";
import { getDb } from "./firestore.server";
import {
  COLLECTIONS,
  fromReservationDoc,
  toReservationDoc,
  type HistoryDoc,
  type ReservationDoc,
  type RoomDoc,
} from "./schema.server";

export type RoomRecord = RoomDoc & { id: string };

export type ReservationsApiOptions = {
  /** Actor recorded on review until real accounts exist (#14 / #86). */
  reviewer?: string;
  /** Display name on new requests until sign-in exists (#14). */
  requester?: string;
  now?: () => Date;
};

const ID_PATTERN = /^REQ-(\d+)$/;

/**
 * Server API for rooms and reservations. Throws the same domain errors the
 * in-memory repository uses so HTTP handlers can map them to status codes.
 */
export class ReservationsApi {
  private readonly db: Firestore;
  private readonly reviewer: string;
  private readonly requester: string;
  private readonly now: () => Date;

  constructor(
    db: Firestore = getDb(),
    {
      reviewer = "Dean's Office",
      requester = UNVERIFIED_REQUESTER,
      now = () => new Date(),
    }: ReservationsApiOptions = {},
  ) {
    this.db = db;
    this.reviewer = reviewer;
    this.requester = requester;
    this.now = now;
  }

  async listRooms(): Promise<RoomRecord[]> {
    const snapshot = await this.db.collection(COLLECTIONS.rooms).get();
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as RoomDoc) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async listReservations(): Promise<EventRequest[]> {
    const snapshot = await this.db.collection(COLLECTIONS.reservations).get();
    const reservations = await Promise.all(
      snapshot.docs.map((doc) => this.hydrate(doc.id, doc.data() as ReservationDoc)),
    );
    return reservations.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  async getReservation(id: string): Promise<EventRequest> {
    const snapshot = await this.db.collection(COLLECTIONS.reservations).doc(id).get();
    if (!snapshot.exists) throw new ReservationNotFoundError(id);
    return this.hydrate(id, snapshot.data() as ReservationDoc);
  }

  /**
   * Validates the body, rejects double bookings with 409, stores server-computed
   * risk, and never trusts id/status/risk/requester from the client.
   */
  async createReservation(input: NewReservation): Promise<EventRequest> {
    const rooms = await this.listRooms();
    const existing = await this.listReservations();
    const form = toValidationForm(input);
    const validation = validateReservation(form, toRoomCapacities(rooms), []);
    if (!validation.canSubmit) {
      throw new ReservationValidationError(
        validation.issues.filter((issue) => issue.severity === "error"),
      );
    }

    const conflicts = findConflicts(
      {
        roomId: input.room,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
      },
      existing,
    );
    if (conflicts.length > 0) throw new ReservationConflictError(conflicts);

    const reservation = withRisk({
      ...input,
      id: nextReservationId(existing),
      requester: this.requester,
      status: "pending" as const,
      submittedAt: this.now().toISOString().slice(0, 10),
      history: [],
    });

    await this.db
      .collection(COLLECTIONS.reservations)
      .doc(reservation.id)
      .set(toReservationDoc(reservation));
    return reservation;
  }

  /** Approve / request changes / reject: updates status and appends history (#85 shape). */
  async reviewReservation(id: string, input: ReviewInput): Promise<EventRequest> {
    if (!isReviewDecision(input.decision)) {
      throw new TypeError(`Invalid review decision: ${String(input.decision)}`);
    }

    const ref = this.db.collection(COLLECTIONS.reservations).doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new ReservationNotFoundError(id);

    const existing = await this.hydrate(id, snapshot.data() as ReservationDoc);
    const updated = applyReviewDecision(
      existing,
      input,
      this.reviewer,
      this.now().toISOString(),
    );
    const newEntry = updated.history[updated.history.length - 1];
    const historyId = String(updated.history.length - 1).padStart(4, "0");

    const batch = this.db.batch();
    batch.set(ref, toReservationDoc(updated));
    batch.set(ref.collection(COLLECTIONS.history).doc(historyId), newEntry);
    await batch.commit();
    return updated;
  }

  private async hydrate(id: string, doc: ReservationDoc): Promise<EventRequest> {
    const history = await this.db
      .collection(COLLECTIONS.reservations)
      .doc(id)
      .collection(COLLECTIONS.history)
      .get();
    const entries = history.docs.map((entry) => entry.data() as HistoryDoc);
    return fromReservationDoc(id, doc, entries);
  }
}

/** Default API bound to the process-wide Firestore client. */
export function getReservationsApi(): ReservationsApi {
  return new ReservationsApi();
}

export function toValidationForm(input: NewReservation): ReservationForm {
  return {
    title: input.title,
    organization: input.organization,
    advisor: input.advisor,
    advisorEmail: input.advisorEmail,
    advisorApproved: input.advisorApproved,
    purpose: input.purpose,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    attendance: String(input.attendance),
    room: input.room,
    hasFood: input.hasFood,
    externalGuests: input.externalGuests,
    itNeeds: input.itNeeds,
    requiredFeatures: [],
  };
}

function toRoomCapacities(rooms: readonly RoomRecord[]): RoomCapacity[] {
  return rooms.map((room) => ({
    id: room.id,
    name: room.name,
    capacity: room.capacity,
    features: room.features,
  }));
}

/** "REQ-<n>", one above the highest numbered id already stored. */
export function nextReservationId(existing: readonly Pick<EventRequest, "id">[]): string {
  let highest = 1000;
  for (const reservation of existing) {
    const match = ID_PATTERN.exec(reservation.id);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `REQ-${highest + 1}`;
}
