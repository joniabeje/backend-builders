import { describe, it } from "vitest";
import assert from "node:assert/strict";
import type { EventRequest, NewReservation } from "@/domain/reservation";
import { ApiReservationRepository } from "./api-reservation-repository";
import {
  ReservationConflictError,
  ReservationNotFoundError,
  ReservationValidationError,
} from "./reservation-repository";

const SAMPLE: EventRequest = {
  id: "REQ-1043",
  title: "Sync",
  organization: "CEA",
  requester: "Unverified requester",
  advisor: "Dr. Okafor",
  advisorEmail: "okafor@howard.edu",
  advisorApproved: true,
  purpose: "Planning",
  date: "2026-06-01",
  startTime: "14:00",
  endTime: "15:00",
  attendance: 12,
  room: "seminar-201",
  status: "pending",
  hasFood: false,
  externalGuests: false,
  itNeeds: false,
  submittedAt: "2026-05-01",
  history: [],
  risk: { level: "low", score: 0, factors: [], requiresReview: false, reviewReason: null },
};

const INPUT: NewReservation = {
  title: SAMPLE.title,
  organization: SAMPLE.organization,
  advisor: SAMPLE.advisor,
  advisorEmail: SAMPLE.advisorEmail,
  advisorApproved: SAMPLE.advisorApproved,
  purpose: SAMPLE.purpose,
  date: SAMPLE.date,
  startTime: SAMPLE.startTime,
  endTime: SAMPLE.endTime,
  attendance: SAMPLE.attendance,
  room: SAMPLE.room,
  hasFood: SAMPLE.hasFood,
  externalGuests: SAMPLE.externalGuests,
  itNeeds: SAMPLE.itNeeds,
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("ApiReservationRepository", () => {
  it("lists reservations from GET /api/reservations", async () => {
    const calls: string[] = [];
    const repository = new ApiReservationRepository({
      fetch: async (input) => {
        calls.push(String(input));
        return jsonResponse([SAMPLE]);
      },
    });
    assert.deepEqual(await repository.list(), [SAMPLE]);
    assert.deepEqual(calls, ["/api/reservations"]);
  });

  it("creates with POST and returns the server record", async () => {
    let body = "";
    const repository = new ApiReservationRepository({
      fetch: async (_input, init) => {
        body = String(init?.body);
        return jsonResponse(SAMPLE, 201);
      },
    });
    assert.deepEqual(await repository.create(INPUT), SAMPLE);
    assert.deepEqual(JSON.parse(body), INPUT);
  });

  it("reviews with PATCH /api/reservations/:id", async () => {
    const updated = { ...SAMPLE, status: "approved" as const };
    let url = "";
    const repository = new ApiReservationRepository({
      fetch: async (input) => {
        url = String(input);
        return jsonResponse(updated);
      },
    });
    assert.deepEqual(
      await repository.review("REQ-1043", { decision: "approved", feedback: "" }),
      updated,
    );
    assert.equal(url, "/api/reservations/REQ-1043");
  });

  it("maps 409 to ReservationConflictError", async () => {
    const repository = new ApiReservationRepository({
      fetch: async () =>
        jsonResponse(
          {
            error: "conflict",
            conflicts: [
              {
                id: "REQ-1",
                room: "seminar-201",
                date: "2026-06-01",
                startTime: "14:00",
                endTime: "15:00",
                status: "pending",
              },
            ],
          },
          409,
        ),
    });
    await assert.rejects(() => repository.create(INPUT), ReservationConflictError);
  });

  it("maps 400 with issues to ReservationValidationError", async () => {
    const repository = new ApiReservationRepository({
      fetch: async () =>
        jsonResponse(
          {
            error: "invalid",
            issues: [{ code: "advisor-email-invalid", severity: "error", message: "bad email" }],
          },
          400,
        ),
    });
    await assert.rejects(
      () => repository.create(INPUT),
      (error: unknown) => {
        assert.ok(error instanceof ReservationValidationError);
        assert.equal(error.issues[0].code, "advisor-email-invalid");
        return true;
      },
    );
  });

  it("maps 404 to ReservationNotFoundError", async () => {
    const repository = new ApiReservationRepository({
      fetch: async () => jsonResponse({ error: "Reservation REQ-9999 was not found." }, 404),
    });
    await assert.rejects(
      () => repository.review("REQ-9999", { decision: "approved", feedback: "" }),
      (error: unknown) => {
        assert.ok(error instanceof ReservationNotFoundError);
        assert.equal(error.reservationId, "REQ-9999");
        return true;
      },
    );
  });

  it("uses baseUrl when provided", async () => {
    let url = "";
    const repository = new ApiReservationRepository({
      baseUrl: "http://127.0.0.1:4173",
      fetch: async (input) => {
        url = String(input);
        return jsonResponse([]);
      },
    });
    await repository.list();
    assert.equal(url, "http://127.0.0.1:4173/api/reservations");
  });
});
