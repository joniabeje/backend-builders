import type { EventRequest, NewReservation, UnscoredEventRequest } from "@/domain/reservation";
import { withRisk } from "@/domain/risk";
import { applyReviewDecision, isReviewDecision, type ReviewInput } from "@/domain/review-decision";
import { findConflicts } from "@/domain/room-availability";
import {
  ReservationConflictError,
  ReservationNotFoundError,
  type ReservationRepository,
} from "./reservation-repository";

export type InMemoryReservationRepositoryOptions = {
  /** Recorded as the actor on every review until real accounts exist (#14). */
  reviewer?: string;
  /** Recorded as the requester on every new request until real accounts exist (#14). */
  requester?: string;
  now?: () => Date;
};

/**
 * Prototype implementation that keeps reservations in memory for the lifetime of the
 * app instance. The seed is injected by the caller so this class never depends on
 * mock data, and every read returns copies so callers cannot mutate stored state.
 * Risk is computed once when a reservation is stored, as the API will do on submit (#5).
 */
export class InMemoryReservationRepository implements ReservationRepository {
  private readonly reservations = new Map<string, EventRequest>();
  private readonly reviewer: string;
  private readonly requester: string;
  private readonly now: () => Date;

  constructor(
    seed: readonly UnscoredEventRequest[],
    {
      reviewer = "Dean's Office",
      requester = UNVERIFIED_REQUESTER,
      now = () => new Date(),
    }: InMemoryReservationRepositoryOptions = {},
  ) {
    this.reviewer = reviewer;
    this.requester = requester;
    this.now = now;
    for (const reservation of seed) {
      if (this.reservations.has(reservation.id)) {
        throw new Error(`Duplicate reservation id in seed: ${reservation.id}`);
      }
      this.reservations.set(reservation.id, copy(withRisk(reservation)));
    }
  }

  async list(): Promise<EventRequest[]> {
    return Array.from(this.reservations.values(), copy);
  }

  async create(input: NewReservation): Promise<EventRequest> {
    const slot = {
      roomId: input.room,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
    };
    const conflicts = findConflicts(slot, Array.from(this.reservations.values()));
    if (conflicts.length > 0) throw new ReservationConflictError(conflicts);

    const reservation = withRisk({
      ...input,
      id: this.nextId(),
      requester: this.requester,
      status: "pending" as const,
      submittedAt: this.now().toISOString().slice(0, 10),
      history: [],
    });
    this.reservations.set(reservation.id, reservation);
    return copy(reservation);
  }

  async review(id: string, input: ReviewInput): Promise<EventRequest> {
    if (!isReviewDecision(input.decision)) {
      throw new TypeError(`Invalid review decision: ${String(input.decision)}`);
    }
    const existing = this.reservations.get(id);
    if (!existing) throw new ReservationNotFoundError(id);

    const updated = applyReviewDecision(existing, input, this.reviewer, this.now().toISOString());
    this.reservations.set(id, updated);
    return copy(updated);
  }

  /** "REQ-<n>", one above the highest numbered id stored so far. */
  private nextId(): string {
    let highest = 1000;
    for (const id of this.reservations.keys()) {
      const match = ID_PATTERN.exec(id);
      if (match) highest = Math.max(highest, Number(match[1]));
    }
    return `REQ-${highest + 1}`;
  }
}

/** Shown as the requester until sign-in exists (#14). */
export const UNVERIFIED_REQUESTER = "Unverified requester";

const ID_PATTERN = /^REQ-(\d+)$/;

function copy(reservation: EventRequest): EventRequest {
  return {
    ...reservation,
    history: reservation.history.map((entry) => ({ ...entry })),
    risk: {
      ...reservation.risk,
      factors: reservation.risk.factors.map((factor) => ({ ...factor })),
    },
  };
}
