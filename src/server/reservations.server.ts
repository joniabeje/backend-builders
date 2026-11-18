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
import {
  CUSTODIAL_PHASES,
  custodialNotificationDetails,
  shouldNotifyCustodialOnApprove,
} from "@/domain/custodial-notification";
import { itNotificationDetails, shouldNotifyItOnApprove } from "@/domain/it-notification";
import { withRisk } from "@/domain/risk";
import {
  securityNotificationDetails,
  shouldNotifySecurityOnApprove,
} from "@/domain/security-notification";
import { applyReviewDecision, isReviewDecision, type ReviewInput } from "@/domain/review-decision";
import { findConflicts, type BookedSlot } from "@/domain/room-availability";
import { getRoomDisplayName } from "@/lib/rooms";
import { getDb } from "./firestore.server";
import { NotificationsApi } from "./notifications.server";
import {
  COLLECTIONS,
  RESERVATION_COUNTER_ID,
  fromReservationDoc,
  toReservationDoc,
  type HistoryDoc,
  type ReservationCounterDoc,
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
  /** Used to notify IT / custodial / security when an approved request qualifies (#42, #44, #47). */
  notifications?: NotificationsApi;
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
  private readonly notifications: NotificationsApi;

  constructor(
    db: Firestore = getDb(),
    {
      reviewer = "Dean's Office",
      requester = UNVERIFIED_REQUESTER,
      now = () => new Date(),
      notifications,
    }: ReservationsApiOptions = {},
  ) {
    this.db = db;
    this.reviewer = reviewer;
    this.requester = requester;
    this.now = now;
    this.notifications = notifications ?? new NotificationsApi(db, { now });
  }

  async listRooms(): Promise<RoomRecord[]> {
    const snapshot = await this.db.collection(COLLECTIONS.rooms).get();
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as RoomDoc) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * All reservations, or only those for `requesterId` ("my requests" / #36). Newest
   * `submittedAt` first. The requesterId filter uses the composite index in
   * firestore.indexes.json.
   */
  async listReservations(filter?: { requesterId?: string }): Promise<EventRequest[]> {
    const collection = this.db.collection(COLLECTIONS.reservations);
    const snapshot = filter?.requesterId
      ? await collection
          .where("requesterId", "==", filter.requesterId)
          .orderBy("submittedAt", "desc")
          .get()
      : await collection.get();
    const reservations = await Promise.all(
      snapshot.docs.map((doc) => this.hydrate(doc.id, doc.data() as ReservationDoc)),
    );
    if (filter?.requesterId) return reservations;
    return reservations.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  async getReservation(id: string): Promise<EventRequest> {
    const snapshot = await this.db.collection(COLLECTIONS.reservations).doc(id).get();
    if (!snapshot.exists) throw new ReservationNotFoundError(id);
    return this.hydrate(id, snapshot.data() as ReservationDoc);
  }

  /**
   * Validates the body, rejects double bookings with 409, stores server-computed
   * risk, and never trusts id/status/risk/requester from the client. When `actor`
   * is set (signed-in create), stores `requesterId` so `requester=me` can find it (#36).
   *
   * Conflict check + insert run in one Firestore transaction with a REQ id counter
   * so two parallel creates for the same slot cannot both succeed (#65).
   */
  async createReservation(
    input: NewReservation,
    actor?: { id: string; name: string } | null,
  ): Promise<EventRequest> {
    const rooms = await this.listRooms();
    const form = toValidationForm(input);
    const validation = validateReservation(form, toRoomCapacities(rooms), []);
    if (!validation.canSubmit) {
      throw new ReservationValidationError(
        validation.issues.filter((issue) => issue.severity === "error"),
      );
    }

    const slot = {
      roomId: input.room,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
    };
    const counterRef = this.db.collection(COLLECTIONS.counters).doc(RESERVATION_COUNTER_ID);
    const sameSlotQuery = this.db
      .collection(COLLECTIONS.reservations)
      .where("room", "==", input.room)
      .where("date", "==", input.date);

    return this.db.runTransaction(async (tx) => {
      const [slotSnap, counterSnap] = await Promise.all([
        tx.get(sameSlotQuery),
        tx.get(counterRef),
      ]);

      const existing = slotSnap.docs.map((doc) =>
        toBookedSlot(doc.id, doc.data() as ReservationDoc),
      );
      const conflicts = findConflicts(slot, existing);
      if (conflicts.length > 0) throw new ReservationConflictError(conflicts);

      const lastNumber = counterSnap.exists
        ? ((counterSnap.data() as ReservationCounterDoc).lastNumber ?? 1000)
        : 1000;
      const nextNumber = lastNumber + 1;
      const reservation = withRisk({
        ...input,
        id: `REQ-${nextNumber}`,
        requester: actor?.name ?? this.requester,
        status: "pending" as const,
        submittedAt: this.now().toISOString().slice(0, 10),
        history: [],
      });

      tx.set(counterRef, { lastNumber: nextNumber } satisfies ReservationCounterDoc);
      tx.set(
        this.db.collection(COLLECTIONS.reservations).doc(reservation.id),
        toReservationDoc(reservation, actor?.id ?? null),
      );
      return reservation;
    });
  }

  /** Approve / request changes / reject: updates status and appends history (#85 shape). */
  async reviewReservation(id: string, input: ReviewInput): Promise<EventRequest> {
    if (!isReviewDecision(input.decision)) {
      throw new TypeError(`Invalid review decision: ${String(input.decision)}`);
    }

    const ref = this.db.collection(COLLECTIONS.reservations).doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new ReservationNotFoundError(id);

    const existingDoc = snapshot.data() as ReservationDoc;
    const existing = await this.hydrate(id, existingDoc);
    const updated = applyReviewDecision(existing, input, this.reviewer, this.now().toISOString());
    const newEntry = updated.history[updated.history.length - 1];
    const historyId = String(updated.history.length - 1).padStart(4, "0");

    const batch = this.db.batch();
    // Keep requesterId so requester=me still finds the row after a review (#36).
    batch.set(ref, toReservationDoc(updated, existingDoc.requesterId));
    batch.set(ref.collection(COLLECTIONS.history).doc(historyId), newEntry);
    await batch.commit();

    if (shouldNotifyItOnApprove(updated, input.decision)) {
      await this.notifications.notify(
        "it",
        updated,
        itNotificationDetails(updated, getRoomDisplayName(updated.room)),
      );
    }

    if (shouldNotifyCustodialOnApprove(updated, input.decision)) {
      const roomLabel = getRoomDisplayName(updated.room);
      for (const phase of CUSTODIAL_PHASES) {
        await this.notifications.notify(
          "custodial",
          updated,
          custodialNotificationDetails(updated, phase, roomLabel),
          { variant: phase },
        );
      }
    }

    if (shouldNotifySecurityOnApprove(updated, input.decision)) {
      await this.notifications.notify(
        "security",
        updated,
        securityNotificationDetails(updated, getRoomDisplayName(updated.room)),
      );
    }

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

/** "REQ-<n>", one above the highest numbered id already stored. Used by seed / tests. */
export function nextReservationId(existing: readonly Pick<EventRequest, "id">[]): string {
  return `REQ-${highestReservationNumber(existing) + 1}`;
}

/** Highest REQ-<n> among ids, or 1000 when none exist (matches the create counter). */
export function highestReservationNumber(existing: readonly Pick<EventRequest, "id">[]): number {
  let highest = 1000;
  for (const reservation of existing) {
    const match = ID_PATTERN.exec(reservation.id);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return highest;
}

function toBookedSlot(id: string, doc: ReservationDoc): BookedSlot {
  return {
    id,
    room: doc.room,
    date: doc.date,
    startTime: doc.startTime,
    endTime: doc.endTime,
    status: doc.status,
  };
}
