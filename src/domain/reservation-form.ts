// State transitions for the reservation form.
//
// Framework-free like reservation-validation.ts: the React hook in
// src/hooks/use-reservation-form.ts is a thin wrapper around this reducer.
import type { BookedSlot } from "./room-availability";
import {
  validateReservation,
  type ReservationForm,
  type RoomCapacity,
} from "./reservation-validation";

export const EMPTY_RESERVATION_FORM: ReservationForm = {
  title: "",
  organization: "",
  advisor: "",
  date: "",
  startTime: "",
  endTime: "",
  attendance: "",
  purpose: "",
  room: "",
  hasFood: false,
  externalGuests: false,
  itNeeds: false,
  requiredFeatures: [],
};

export type ReservationFormState = {
  form: ReservationForm;
  submitted: boolean;
};

export const INITIAL_RESERVATION_FORM_STATE: ReservationFormState = {
  form: EMPTY_RESERVATION_FORM,
  submitted: false,
};

export type ReservationFormAction =
  | {
      [K in keyof ReservationForm]: { type: "update"; field: K; value: ReservationForm[K] };
    }[keyof ReservationForm]
  | { type: "submit"; reservations?: readonly BookedSlot[] }
  | { type: "reset" };

/**
 * Builds the reducer for a given room catalog. `submit` is ignored unless the form
 * passes validation, so the guard holds even if a caller skips the disabled button.
 * `submit` carries the existing reservations so double bookings are blocked here too.
 */
export function createReservationFormReducer(rooms: readonly RoomCapacity[]) {
  return function reservationFormReducer(
    state: ReservationFormState,
    action: ReservationFormAction,
  ): ReservationFormState {
    switch (action.type) {
      case "update":
        return { ...state, form: { ...state.form, [action.field]: action.value } };
      case "submit":
        return validateReservation(state.form, rooms, action.reservations).canSubmit
          ? { ...state, submitted: true }
          : state;
      case "reset":
        return INITIAL_RESERVATION_FORM_STATE;
    }
  };
}
