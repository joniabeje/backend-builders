import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_RESERVATION_FORM,
  INITIAL_RESERVATION_FORM_STATE,
  createReservationFormReducer,
  type ReservationFormState,
} from "./reservation-form";
import type { ReservationForm, RoomCapacity } from "./reservation-validation";

const ROOMS: RoomCapacity[] = [{ id: "seminar-201", name: "Seminar Room 201", capacity: 25 }];

const VALID_FORM: ReservationForm = {
  title: "NSBE General Body Meeting",
  organization: "NSBE — Howard Chapter",
  advisor: "Dr. Williams",
  date: "2026-11-04",
  startTime: "12:00",
  endTime: "13:00",
  attendance: "20",
  purpose: "Monthly chapter meeting",
  room: "seminar-201",
  hasFood: false,
  externalGuests: false,
  itNeeds: false,
};

const reduce = createReservationFormReducer(ROOMS);

function stateWith(form: ReservationForm, submitted = false): ReservationFormState {
  return { form, submitted };
}

describe("reservationFormReducer", () => {
  it("starts with an empty, unsubmitted form", () => {
    assert.deepEqual(INITIAL_RESERVATION_FORM_STATE, {
      form: EMPTY_RESERVATION_FORM,
      submitted: false,
    });
  });

  it("updates one field and leaves the others alone", () => {
    const next = reduce(INITIAL_RESERVATION_FORM_STATE, {
      type: "update",
      field: "title",
      value: "Robotics Workshop",
    });
    assert.equal(next.form.title, "Robotics Workshop");
    assert.deepEqual({ ...next.form, title: "" }, EMPTY_RESERVATION_FORM);
  });

  it("updates boolean toggles", () => {
    const next = reduce(INITIAL_RESERVATION_FORM_STATE, {
      type: "update",
      field: "hasFood",
      value: true,
    });
    assert.equal(next.form.hasFood, true);
  });

  it("does not mutate the previous state", () => {
    const before = stateWith({ ...VALID_FORM });
    reduce(before, { type: "update", field: "title", value: "Changed" });
    assert.equal(before.form.title, VALID_FORM.title);
  });

  it("submits a valid form", () => {
    const next = reduce(stateWith(VALID_FORM), { type: "submit" });
    assert.equal(next.submitted, true);
    assert.deepEqual(next.form, VALID_FORM);
  });

  it("ignores submit when a required field is missing", () => {
    const state = stateWith({ ...VALID_FORM, advisor: "" });
    assert.equal(reduce(state, { type: "submit" }), state);
  });

  it("ignores submit when validation has an error", () => {
    const state = stateWith({ ...VALID_FORM, attendance: "40" });
    assert.equal(reduce(state, { type: "submit" }), state);
  });

  it("submits despite warnings", () => {
    const next = reduce(stateWith({ ...VALID_FORM, hasFood: true }), { type: "submit" });
    assert.equal(next.submitted, true);
  });

  it("resets to an empty form after submission", () => {
    const next = reduce(stateWith(VALID_FORM, true), { type: "reset" });
    assert.deepEqual(next, INITIAL_RESERVATION_FORM_STATE);
  });
});
