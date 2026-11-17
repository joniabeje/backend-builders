// State transitions for the reservation form.
//
// Framework-free like reservation-validation.ts: the React hook in
// src/hooks/use-reservation-form.ts is a thin wrapper around this reducer.
import type { NewReservation } from "./reservation";
import type { BookedSlot } from "./room-availability";
import {
  parseAttendance,
  validateReservation,
  type ReservationForm,
  type RoomCapacity,
} from "./reservation-validation";

export const EMPTY_RESERVATION_FORM: ReservationForm = {
  title: "",
  organization: "",
  advisor: "",
  advisorEmail: "",
  advisorApproved: false,
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
  /** Id of the saved request once submission succeeds, or null while editing. */
  submittedId: string | null;
};

export const INITIAL_RESERVATION_FORM_STATE: ReservationFormState = {
  form: EMPTY_RESERVATION_FORM,
  submittedId: null,
};

export type ReservationFormAction =
  | {
      [K in keyof ReservationForm]: { type: "update"; field: K; value: ReservationForm[K] };
    }[keyof ReservationForm]
  | { type: "toggleFeature"; feature: string }
  | { type: "submitted"; id: string }
  | { type: "reset" };

export function reservationFormReducer(
  state: ReservationFormState,
  action: ReservationFormAction,
): ReservationFormState {
  switch (action.type) {
    case "update":
      return { ...state, form: { ...state.form, [action.field]: action.value } };
    case "submitted":
      return { ...state, submittedId: action.id };
    case "reset":
      return INITIAL_RESERVATION_FORM_STATE;
  }
}

/**
 * The submit guard: returns the payload to save, or null when the form must not be
 * submitted. It re-runs validation (including the double-booking check against
 * `reservations`), so it holds even if a caller skips the disabled button.
 *
 * Strings are trimmed and attendance is parsed to a number. Fields the form only uses
 * for guidance (required room features) are not part of the request.
 */
export function prepareSubmission(
  form: ReservationForm,
  rooms: readonly RoomCapacity[],
  reservations: readonly BookedSlot[] = [],
): NewReservation | null {
  if (!validateReservation(form, rooms, reservations).canSubmit) return null;
  const attendance = parseAttendance(form.attendance);
  if (attendance === null) return null;

  return {
    title: form.title.trim(),
    organization: form.organization.trim(),
    advisor: form.advisor.trim(),
    advisorEmail: form.advisorEmail.trim(),
    advisorApproved: form.advisorApproved,
    purpose: form.purpose.trim(),
    date: form.date.trim(),
    startTime: form.startTime.trim(),
    endTime: form.endTime.trim(),
    attendance,
    room: form.room,
    hasFood: form.hasFood,
    externalGuests: form.externalGuests,
    itNeeds: form.itNeeds,
  };
}
