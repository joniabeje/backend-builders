import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { ReservationConflictError } from "@/data/reservation-repository";
import { roomConflictMessage } from "@/domain/room-availability";
import { reservationSubmitErrorMessage } from "./reservation-submit-error";

const ROOMS = [{ id: "seminar-201", name: "Seminar Room 201" }];
const FORM = { room: "seminar-201", date: "2026-11-04" };
const CONFLICT = {
  id: "REQ-1040",
  room: "seminar-201",
  date: "2026-11-04",
  startTime: "12:30",
  endTime: "14:00",
  status: "pending" as const,
};

describe("reservationSubmitErrorMessage", () => {
  it("maps a 409 to the same room-conflict wording as live validation", () => {
    const error = new ReservationConflictError([CONFLICT]);
    assert.equal(
      reservationSubmitErrorMessage(error, FORM, ROOMS),
      roomConflictMessage("Seminar Room 201", "2026-11-04", [CONFLICT]),
    );
    assert.match(
      reservationSubmitErrorMessage(error, FORM, ROOMS),
      /Seminar Room 201 is already booked on 2026-11-04 at 12:30–14:00 \(REQ-1040\)/,
    );
  });

  it("passes through non-conflict errors", () => {
    assert.equal(
      reservationSubmitErrorMessage(new Error("Network down."), FORM, ROOMS),
      "Network down.",
    );
  });
});
