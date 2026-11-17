import type { EventRequest, NewReservation } from "@/domain/reservation";
import type { ValidationIssue } from "@/domain/reservation-validation";
import type { ReviewInput } from "@/domain/review-decision";
import type { BookedSlot } from "@/domain/room-availability";

/**
 * Data-access boundary for reservations. UI code depends on this interface only,
 * so replacing the in-memory implementation with an API client (TD-01) does not
 * touch any route.
 */
export interface ReservationRepository {
  list(): Promise<EventRequest[]>;
  /**
   * Saves a new request (#2). The store assigns the id, requester, "pending" status,
   * submittedAt and an empty history, and computes risk (#5); none of these come from
   * the client. Rejects with ReservationConflictError if the room is already booked.
   */
  create(input: NewReservation): Promise<EventRequest>;
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

/** The requested room is already held for an overlapping time. The API returns 409 (#22). */
export class ReservationConflictError extends Error {
  readonly conflicts: readonly BookedSlot[];

  constructor(conflicts: readonly BookedSlot[]) {
    super(
      `The room is already booked at that time (${conflicts.map((c) => c.id).join(", ")}). Choose another room or time.`,
    );
    this.name = "ReservationConflictError";
    this.conflicts = conflicts;
  }
}

/** Field validation failed on create. The API returns 400 with these issues (#32, #55). */
export class ReservationValidationError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[]) {
    super("The reservation could not be created because of validation errors.");
    this.name = "ReservationValidationError";
    this.issues = issues;
  }
}
