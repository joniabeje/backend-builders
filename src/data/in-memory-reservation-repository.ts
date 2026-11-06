import type { EventRequest } from "@/domain/reservation";
import { applyReviewDecision, isReviewDecision, type ReviewInput } from "@/domain/review-decision";
import { ReservationNotFoundError, type ReservationRepository } from "./reservation-repository";

export type InMemoryReservationRepositoryOptions = {
  /** Recorded as the actor on every review until real accounts exist (#14). */
  reviewer?: string;
  now?: () => Date;
};

/**
 * Prototype implementation that keeps reservations in memory for the lifetime of the
 * app instance. The seed is injected by the caller so this class never depends on
 * mock data, and every read returns copies so callers cannot mutate stored state.
 */
export class InMemoryReservationRepository implements ReservationRepository {
  private readonly reservations = new Map<string, EventRequest>();
  private readonly reviewer: string;
  private readonly now: () => Date;

  constructor(
    seed: readonly EventRequest[],
    {
      reviewer = "Dean's Office",
      now = () => new Date(),
    }: InMemoryReservationRepositoryOptions = {},
  ) {
    this.reviewer = reviewer;
    this.now = now;
    for (const reservation of seed) {
      if (this.reservations.has(reservation.id)) {
        throw new Error(`Duplicate reservation id in seed: ${reservation.id}`);
      }
      this.reservations.set(reservation.id, copy(reservation));
    }
  }

  async list(): Promise<EventRequest[]> {
    return Array.from(this.reservations.values(), copy);
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
}

function copy(reservation: EventRequest): EventRequest {
  return { ...reservation, history: reservation.history.map((entry) => ({ ...entry })) };
}
