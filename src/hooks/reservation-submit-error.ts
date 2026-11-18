// Maps save failures to the copy shown under the reserve form (#66).
import { ReservationConflictError } from "@/data/reservation-repository";
import { roomConflictMessage } from "@/domain/room-availability";
import type { ReservationForm } from "@/domain/reservation-validation";

export type NamedRoom = {
  id: string;
  name: string;
};

/**
 * 409 conflicts reuse the live `room-conflict` message; other errors keep their
 * server/client message. The form itself is never cleared on failure.
 */
export function reservationSubmitErrorMessage(
  error: Error,
  form: Pick<ReservationForm, "room" | "date">,
  rooms: readonly NamedRoom[],
): string {
  if (error instanceof ReservationConflictError && error.conflicts.length > 0) {
    const roomName = rooms.find((room) => room.id === form.room)?.name ?? form.room;
    return roomConflictMessage(roomName, form.date, error.conflicts);
  }
  return error.message;
}
