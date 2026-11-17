import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  EMPTY_RESERVATION_FORM,
  INITIAL_RESERVATION_FORM_STATE,
  prepareSubmission,
  reservationFormReducer as reduce,
  type ReservationFormState,
} from "./reservation-form";
import type { ReservationForm, RoomCapacity } from "./reservation-validation";
import type { BookedSlot } from "./room-availability";

const ROOMS: RoomCapacity[] = [{ id: "seminar-201", name: "Seminar Room 201", capacity: 25 }];

const VALID_FORM: ReservationForm = {
  title: "NSBE General Body Meeting",
  organization: "NSBE — Howard Chapter",
  advisor: "Dr. Williams",
  advisorEmail: "williams@howard.edu",
  advisorApproved: true,
  date: "2026-11-04",
  startTime: "12:00",
  endTime: "13:00",
  attendance: "20",
  purpose: "Monthly chapter meeting",
  room: "seminar-201",
  hasFood: false,
  externalGuests: false,
  itNeeds: false,
  requiredFeatures: [],
};

function stateWith(form: ReservationForm, submittedId: string | null = null): ReservationFormState {
  return { form, submittedId };
}

describe("reservationFormReducer", () => {
  it("starts with an empty, unsubmitted form", () => {
    assert.deepEqual(INITIAL_RESERVATION_FORM_STATE, {
      form: EMPTY_RESERVATION_FORM,
      submittedId: null,
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

  it("adds a required feature that is not selected yet", () => {
    const next = reduce(stateWith({ ...VALID_FORM, requiredFeatures: ["Projector"] }), {
      type: "toggleFeature",
      feature: "Whiteboard",
    });
    assert.deepEqual(next.form.requiredFeatures, ["Projector", "Whiteboard"]);
  });

  it("removes a required feature that is already selected", () => {
    const next = reduce(stateWith({ ...VALID_FORM, requiredFeatures: ["Projector", "Stage"] }), {
      type: "toggleFeature",
      feature: "Projector",
    });
    assert.deepEqual(next.form.requiredFeatures, ["Stage"]);
  });

  it("does not mutate the previous state", () => {
    const before = stateWith({ ...VALID_FORM });
    reduce(before, { type: "update", field: "title", value: "Changed" });
    assert.equal(before.form.title, VALID_FORM.title);
  });

  it("records the saved request id and keeps the form for the confirmation", () => {
    const next = reduce(stateWith(VALID_FORM), { type: "submitted", id: "REQ-1043" });
    assert.equal(next.submittedId, "REQ-1043");
    assert.deepEqual(next.form, VALID_FORM);
  });

  it("resets to an empty form after submission", () => {
    const next = reduce(stateWith(VALID_FORM, "REQ-1043"), { type: "reset" });
    assert.deepEqual(next, INITIAL_RESERVATION_FORM_STATE);
  });
});

describe("prepareSubmission", () => {
  it("maps a valid form to the request payload", () => {
    assert.deepEqual(prepareSubmission(VALID_FORM, ROOMS), {
      title: "NSBE General Body Meeting",
      organization: "NSBE — Howard Chapter",
      advisor: "Dr. Williams",
      advisorEmail: "williams@howard.edu",
      advisorApproved: true,
      purpose: "Monthly chapter meeting",
      date: "2026-11-04",
      startTime: "12:00",
      endTime: "13:00",
      attendance: 20,
      room: "seminar-201",
      hasFood: false,
      externalGuests: false,
      itNeeds: false,
    });
  });

  it("trims text, parses attendance, and carries the service toggles", () => {
    const payload = prepareSubmission(
      {
        ...VALID_FORM,
        title: "  Robotics Workshop ",
        advisor: " Dr. Harris",
        advisorEmail: " harris@howard.edu ",
        attendance: " 24 ",
        hasFood: true,
        externalGuests: true,
        itNeeds: true,
      },
      ROOMS,
    );
    assert.ok(payload);
    assert.equal(payload.title, "Robotics Workshop");
    assert.equal(payload.advisor, "Dr. Harris");
    assert.equal(payload.advisorEmail, "harris@howard.edu");
    assert.equal(payload.attendance, 24);
    assert.deepEqual(
      [payload.hasFood, payload.externalGuests, payload.itNeeds],
      [true, true, true],
    );
  });

  it("leaves out fields the store assigns and form-only guidance", () => {
    const payload = prepareSubmission({ ...VALID_FORM, requiredFeatures: ["Projector"] }, ROOMS);
    assert.ok(payload);
    for (const key of ["id", "requester", "status", "submittedAt", "history", "risk"]) {
      assert.equal(key in payload, false, key);
    }
    assert.equal("requiredFeatures" in payload, false);
  });

  it("returns null when a required field is missing", () => {
    assert.equal(prepareSubmission({ ...VALID_FORM, advisor: "" }, ROOMS), null);
  });

  it("returns null until advisor approval is confirmed", () => {
    assert.equal(prepareSubmission({ ...VALID_FORM, advisorApproved: false }, ROOMS), null);
  });

  it("returns null when validation has an error", () => {
    assert.equal(prepareSubmission({ ...VALID_FORM, attendance: "40" }, ROOMS), null);
  });

  it("allows submission despite warnings", () => {
    assert.ok(prepareSubmission({ ...VALID_FORM, hasFood: true }, ROOMS));
  });

  it("returns null when the room is already booked for that time", () => {
    const booked: BookedSlot[] = [
      {
        id: "REQ-1",
        room: "seminar-201",
        date: VALID_FORM.date,
        startTime: VALID_FORM.startTime,
        endTime: VALID_FORM.endTime,
        status: "pending",
      },
    ];
    assert.equal(prepareSubmission(VALID_FORM, ROOMS, booked), null);
  });
});
