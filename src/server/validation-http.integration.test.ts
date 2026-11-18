// HTTP coverage for POST /api/reservations validation → 400 (#32).
import { beforeEach, describe, it } from "vitest";
import assert from "node:assert/strict";
import type { NewReservation } from "@/domain/reservation";
import { getDb } from "./firestore.server";
import { handleCreateReservation, handleListReservations } from "./reservations-http.server";
import { seedDatabase } from "./seed.server";
import { clearEmulator } from "./testing/emulator";

const VALID: NewReservation = {
  title: "Validation HTTP Check",
  organization: "CEA Student Council",
  advisor: "Dr. Okafor",
  advisorEmail: "okafor@howard.edu",
  advisorApproved: true,
  purpose: "Assert 400 with field errors over HTTP.",
  date: "2026-08-01",
  startTime: "14:00",
  endTime: "15:00",
  attendance: 12,
  room: "seminar-201",
  hasFood: false,
  externalGuests: false,
  itNeeds: false,
};

function createRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/reservations validation (#32)", () => {
  beforeEach(async () => {
    await clearEmulator();
    await seedDatabase(getDb(), { reservations: [] });
  });

  it("returns 400 with field issues and saves nothing for an invalid payload", async () => {
    const response = await handleCreateReservation(
      createRequest({
        ...VALID,
        advisorEmail: "not-an-email",
        advisorApproved: false,
      }),
    );
    assert.equal(response.status, 400);
    const body = (await response.json()) as {
      error: string;
      issues: { code: string }[];
    };
    const codes = body.issues.map((issue) => issue.code);
    assert.ok(codes.includes("advisor-email-invalid"));
    assert.ok(codes.includes("advisor-approval-missing"));

    const listed = await handleListReservations(new Request("http://localhost/api/reservations"));
    assert.equal(listed.status, 200);
    assert.deepEqual(await listed.json(), []);
  });

  it("ignores client-supplied risk and stores server-computed risk (#82)", async () => {
    const response = await handleCreateReservation(
      createRequest({
        ...VALID,
        risk: { level: "high", score: 99, factors: [], requiresReview: true, reviewReason: "fake" },
        status: "approved",
        id: "REQ-HACK",
      }),
    );
    assert.equal(response.status, 201);
    const created = (await response.json()) as {
      id: string;
      status: string;
      risk: { level: string; score: number };
    };
    assert.match(created.id, /^REQ-\d+$/);
    assert.notEqual(created.id, "REQ-HACK");
    assert.equal(created.status, "pending");
    assert.equal(created.risk.level, "low");
    assert.equal(created.risk.score, 0);
  });
});
