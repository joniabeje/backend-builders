import { useCallback, useMemo, useReducer } from "react";
import {
  INITIAL_RESERVATION_FORM_STATE,
  createReservationFormReducer,
  type ReservationFormAction,
} from "@/domain/reservation-form";
import { validateReservation, type ReservationForm } from "@/domain/reservation-validation";
import { ROOMS, recommendRooms } from "@/lib/rooms";

const reservationFormReducer = createReservationFormReducer(ROOMS);

/** Form state, live validation, and room recommendations for the /reserve page. */
export function useReservationForm() {
  const [{ form, submitted }, dispatch] = useReducer(
    reservationFormReducer,
    INITIAL_RESERVATION_FORM_STATE,
  );

  const validation = validateReservation(form, ROOMS);
  const recommendations = useMemo(
    () => recommendRooms(validation.attendance),
    [validation.attendance],
  );

  const update = useCallback(
    <K extends keyof ReservationForm>(field: K, value: ReservationForm[K]) =>
      // TypeScript cannot narrow the mapped action union from a generic key.
      dispatch({ type: "update", field, value } as ReservationFormAction),
    [],
  );
  const submit = useCallback(() => dispatch({ type: "submit" }), []);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  return { form, submitted, validation, recommendations, update, submit, reset };
}
