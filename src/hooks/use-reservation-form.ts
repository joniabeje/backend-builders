import { useCallback, useMemo, useReducer } from "react";
import {
  INITIAL_RESERVATION_FORM_STATE,
  createReservationFormReducer,
  type ReservationFormAction,
} from "@/domain/reservation-form";
import { validateReservation, type ReservationForm } from "@/domain/reservation-validation";
import { getRoomAvailability, isCompleteSlot } from "@/domain/room-availability";
import { recommendRooms } from "@/domain/room-recommendation";
import type { EventRequest } from "@/domain/reservation";
import { useReservations } from "@/hooks/use-reservations";
import { ROOMS } from "@/lib/rooms";

const reservationFormReducer = createReservationFormReducer(ROOMS);
const ROOM_IDS = ROOMS.map((room) => room.id);
const NO_RESERVATIONS: readonly EventRequest[] = [];

/**
 * "unchecked": no complete date and time yet, so every room is listed.
 * "loading" / "error": existing reservations are not available, so submit is blocked.
 * "checked": rooms are filtered to those free for the selected slot.
 */
export type AvailabilityStatus = "unchecked" | "loading" | "error" | "checked";

/** Form state, live validation, room availability, and recommendations for the /reserve page. */
export function useReservationForm() {
  const [{ form, submitted }, dispatch] = useReducer(
    reservationFormReducer,
    INITIAL_RESERVATION_FORM_STATE,
  );
  const reservationsQuery = useReservations();
  const reservations = reservationsQuery.data ?? NO_RESERVATIONS;
  const reservationsLoaded = reservationsQuery.isSuccess;

  const validation = validateReservation(form, ROOMS, reservations);

  const { date, startTime, endTime } = form;
  const slotComplete = isCompleteSlot({ date, startTime, endTime });
  const availability = useMemo(
    () => getRoomAvailability(ROOM_IDS, { date, startTime, endTime }, reservations),
    [date, startTime, endTime, reservations],
  );

  let availabilityStatus: AvailabilityStatus = "checked";
  if (!slotComplete) availabilityStatus = "unchecked";
  else if (reservationsQuery.isError) availabilityStatus = "error";
  else if (!reservationsLoaded) availabilityStatus = "loading";

  const availableRooms = useMemo(
    () =>
      availabilityStatus === "checked"
        ? ROOMS.filter((room) => availability.get(room.id)?.available)
        : ROOMS,
    [availabilityStatus, availability],
  );

  // Until reservations load, recommend on capacity and features only; the UI says
  // availability is not checked yet and submit stays blocked.
  const recommendationReservations = reservationsLoaded ? reservations : NO_RESERVATIONS;
  const { requiredFeatures, room: preferredRoomId } = form;
  const recommendations = useMemo(
    () =>
      recommendRooms(
        {
          attendance: validation.attendance,
          date,
          startTime,
          endTime,
          requiredFeatures,
          preferredRoomId,
        },
        ROOMS,
        recommendationReservations,
      ),
    [
      validation.attendance,
      date,
      startTime,
      endTime,
      requiredFeatures,
      preferredRoomId,
      recommendationReservations,
    ],
  );

  // Without the existing reservations a double booking cannot be ruled out.
  const canSubmit = validation.canSubmit && reservationsLoaded;

  const update = useCallback(
    <K extends keyof ReservationForm>(field: K, value: ReservationForm[K]) =>
      // TypeScript cannot narrow the mapped action union from a generic key.
      dispatch({ type: "update", field, value } as ReservationFormAction),
    [],
  );
  const submit = useCallback(() => {
    if (reservationsLoaded) dispatch({ type: "submit", reservations });
  }, [reservationsLoaded, reservations]);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  return {
    form,
    submitted,
    validation: { ...validation, canSubmit },
    availabilityStatus,
    availableRooms,
    recommendations,
    update,
    submit,
    reset,
  };
}
