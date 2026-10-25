import type { EventRequest, RequestStatus } from "@/domain/reservation";

/**
 * Data-access boundary for reservations. UI code depends on this interface only,
 * so replacing the in-memory implementation with an API client (TD-01) does not
 * touch any route.
 */
export interface ReservationRepository {
  list(): Promise<EventRequest[]>;
  /** Resolves with the updated reservation; rejects with ReservationNotFoundError for unknown ids. */
  updateStatus(id: string, status: RequestStatus): Promise<EventRequest>;
}

export class ReservationNotFoundError extends Error {
  readonly reservationId: string;

  constructor(reservationId: string) {
    super(`Reservation ${reservationId} was not found.`);
    this.name = "ReservationNotFoundError";
    this.reservationId = reservationId;
  }
}
