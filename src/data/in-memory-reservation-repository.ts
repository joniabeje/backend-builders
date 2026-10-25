import { isRequestStatus, type EventRequest, type RequestStatus } from "@/domain/reservation";
import { ReservationNotFoundError, type ReservationRepository } from "./reservation-repository";

/**
 * Prototype implementation that keeps reservations in memory for the lifetime of the
 * app instance. The seed is injected by the caller so this class never depends on
 * mock data, and every read returns copies so callers cannot mutate stored state.
 */
export class InMemoryReservationRepository implements ReservationRepository {
  private readonly reservations = new Map<string, EventRequest>();

  constructor(seed: readonly EventRequest[]) {
    for (const reservation of seed) {
      if (this.reservations.has(reservation.id)) {
        throw new Error(`Duplicate reservation id in seed: ${reservation.id}`);
      }
      this.reservations.set(reservation.id, { ...reservation });
    }
  }

  async list(): Promise<EventRequest[]> {
    return Array.from(this.reservations.values(), (reservation) => ({ ...reservation }));
  }

  async updateStatus(id: string, status: RequestStatus): Promise<EventRequest> {
    if (!isRequestStatus(status)) {
      throw new TypeError(`Invalid reservation status: ${String(status)}`);
    }
    const existing = this.reservations.get(id);
    if (!existing) throw new ReservationNotFoundError(id);

    const updated = { ...existing, status };
    this.reservations.set(id, updated);
    return { ...updated };
  }
}
