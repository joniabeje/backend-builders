import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  ReservationConflictError,
  ReservationNotFoundError,
  ReservationValidationError,
} from "@/data/reservation-repository";
import { ReviewFeedbackError } from "@/domain/review-decision";
import { errorResponse, readNewReservation, readReviewInput } from "./api.server";
import { nextReservationId } from "./reservations.server";

describe("readNewReservation", () => {
  it("keeps only NewReservation fields from the JSON body", async () => {
    const request = new Request("http://localhost/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Meetup",
        organization: "NSBE",
        advisor: "Dr. Okafor",
        advisorEmail: "okafor@howard.edu",
        advisorApproved: true,
        purpose: "Chapter meeting",
        date: "2026-06-01",
        startTime: "14:00",
        endTime: "15:00",
        attendance: 20,
        room: "seminar-201",
        hasFood: false,
        externalGuests: false,
        itNeeds: true,
        // Client must not be able to set these:
        id: "REQ-hacked",
        status: "approved",
        risk: { level: "low", score: 0, factors: [], requiresReview: false },
        requester: "Hacker",
      }),
    });

    const input = await readNewReservation(request);
    assert.equal(input.title, "Meetup");
    assert.equal(input.attendance, 20);
    assert.equal(input.itNeeds, true);
    assert.equal("id" in input, false);
    assert.equal("status" in input, false);
    assert.equal("risk" in input, false);
    assert.equal("requester" in input, false);
  });

  it("rejects a non-integer attendance", async () => {
    const request = new Request("http://localhost/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Meetup",
        organization: "NSBE",
        advisor: "Dr. Okafor",
        advisorEmail: "okafor@howard.edu",
        advisorApproved: true,
        purpose: "Chapter meeting",
        date: "2026-06-01",
        startTime: "14:00",
        endTime: "15:00",
        attendance: 12.5,
        room: "seminar-201",
        hasFood: false,
        externalGuests: false,
        itNeeds: false,
      }),
    });
    await assert.rejects(() => readNewReservation(request), /attendance must be a whole number/);
  });
});

describe("readReviewInput", () => {
  it("reads decision and feedback", async () => {
    const request = new Request("http://localhost/api/reservations/REQ-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: "rejected", feedback: "Please pick another room." }),
    });
    assert.deepEqual(await readReviewInput(request), {
      decision: "rejected",
      feedback: "Please pick another room.",
    });
  });
});

describe("errorResponse", () => {
  it("maps domain errors to the documented status codes", async () => {
    assert.equal(
      errorResponse(new ReservationValidationError([{ code: "time-order", severity: "error", message: "bad" }]))
        .status,
      400,
    );
    assert.equal(errorResponse(new ReviewFeedbackError("rejected")).status, 400);
    assert.equal(
      errorResponse(
        new ReservationConflictError([
          {
            id: "REQ-1",
            room: "seminar-201",
            date: "2026-06-01",
            startTime: "14:00",
            endTime: "15:00",
            status: "pending",
          },
        ]),
      ).status,
      409,
    );
    assert.equal(errorResponse(new ReservationNotFoundError("REQ-9")).status, 404);
  });
});

describe("nextReservationId", () => {
  it("starts at REQ-1001 and increments past the highest REQ number", () => {
    assert.equal(nextReservationId([]), "REQ-1001");
    assert.equal(nextReservationId([{ id: "REQ-1042" }, { id: "other" }]), "REQ-1043");
  });
});
