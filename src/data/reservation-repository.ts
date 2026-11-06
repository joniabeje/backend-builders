import type { EventRequest } from "@/domain/reservation";
import type { ReviewInput } from "@/domain/review-decision";

/**
 * Data-access boundary for reservations. UI code depends on this interface only,
 * so replacing the in-memory implementation with an API client (TD-01) does not
 * touch any route.
 */
export interface ReservationRepository {
  list(): Promise<EventRequest[]>;
  /**
   * Records an admin decision: sets the status and appends a history entry.
   * Resolves with the updated reservation; rejects with ReservationNotFoundError for
   * unknown ids and ReviewFeedbackError when required feedback is missing.
   */
  review(id: string, input: ReviewInput): Promise<EventRequest>;
}

export class ReservationNotFoundError extends Error {
  readonly reservationId: string;

  constructor(reservationId: string) {
    super(`Reservation ${reservationId} was not found.`);
    this.name = "ReservationNotFoundError";
    this.reservationId = reservationId;
  }
}
