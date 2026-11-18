import { useCallback, useMemo, useReducer } from "react";
import {
  INITIAL_RESERVATION_FORM_STATE,
  prepareSubmission,
  reservationFormReducer,
  type ReservationFormAction,
} from "@/domain/reservation-form";
import { validateReservation, type ReservationForm } from "@/domain/reservation-validation";
import { checkSlotAvailability, type ReservationsLoadState } from "@/domain/room-availability";
import { recommendRooms } from "@/domain/room-recommendation";
import type { EventRequest } from "@/domain/reservation";
import { reservationSubmitErrorMessage } from "@/hooks/reservation-submit-error";
import { useCreateReservation, useReservations } from "@/hooks/use-reservations";
import { ROOMS } from "@/lib/rooms";

const NO_RESERVATIONS: readonly EventRequest[] = [];

/** Form state, live validation, room availability, and recommendations for the /reserve page. */
export function useReservationForm() {
  const [{ form, submittedId }, dispatch] = useReducer(
    reservationFormReducer,
    INITIAL_RESERVATION_FORM_STATE,
  );
  const reservationsQuery = useReservations();
  const reservations = reservationsQuery.data ?? NO_RESERVATIONS;
  const reservationsLoaded = reservationsQuery.isSuccess;
  const createReservation = useCreateReservation();

  const validation = validateReservation(form, ROOMS, reservations);

  const { date, startTime, endTime } = form;
  let loadState: ReservationsLoadState = "loading";
  if (reservationsQuery.isError) loadState = "error";
  else if (reservationsLoaded) loadState = "loaded";
  const { status: availabilityStatus, availableRooms } = useMemo(
    () => checkSlotAvailability(ROOMS, { date, startTime, endTime }, reservations, loadState),
    [date, startTime, endTime, reservations, loadState],
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

  // Without the existing reservations a double booking cannot be ruled out, and a
  // request already being saved must not be sent twice.
  const canSubmit = validation.canSubmit && reservationsLoaded && !createReservation.isPending;

  const update = useCallback(
    <K extends keyof ReservationForm>(field: K, value: ReservationForm[K]) =>
      // TypeScript cannot narrow the mapped action union from a generic key.
      dispatch({ type: "update", field, value } as ReservationFormAction),
    [],
  );
  const toggleFeature = useCallback(
    (feature: string) => dispatch({ type: "toggleFeature", feature }),
    [],
  );
  const { mutate: saveReservation, reset: clearSaveError } = createReservation;
  const submit = useCallback(() => {
    if (!reservationsLoaded) return;
    const input = prepareSubmission(form, ROOMS, reservations);
    if (!input) return;
    saveReservation(input, {
      onSuccess: (created) => dispatch({ type: "submitted", id: created.id }),
    });
  }, [form, reservationsLoaded, reservations, saveReservation]);
  const reset = useCallback(() => {
    clearSaveError();
    dispatch({ type: "reset" });
  }, [clearSaveError]);

  const saveError = createReservation.error;
  return {
    form,
    submittedId,
    isSubmitting: createReservation.isPending,
    /**
     * Why the last save failed, or null. 409s use the same "already booked" copy as
     * live validation (#66). The form keeps everything the user typed.
     */
    submitErrorMessage: saveError ? reservationSubmitErrorMessage(saveError, form, ROOMS) : null,
    validation: { ...validation, canSubmit },
    availabilityStatus,
    availableRooms,
    recommendations,
    update,
    toggleFeature,
    submit,
    reset,
  };
}
