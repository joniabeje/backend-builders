// Integration: create → approve → list shows Approved (#87).
import { beforeEach, describe, it } from "vitest";
import assert from "node:assert/strict";
import type { EventRequest, NewReservation } from "@/domain/reservation";
import { getAuthApi } from "./auth.server";
import { SESSION_COOKIE } from "./cookies.server";
import { getDb } from "./firestore.server";
import { handleCreateReservation, handleListReservations } from "./reservations-http.server";
import { handleReviewPatch } from "./review-http.server";
import { seedDatabase } from "./seed.server";
import { clearEmulator } from "./testing/emulator";

const VALID: NewReservation = {
  title: "Approval Flow Event",
  organization: "CEA Student Council",
  advisor: "Dr. Okafor",
  advisorEmail: "okafor@howard.edu",
  advisorApproved: true,
  purpose: "Create, approve, then list as Approved.",
  date: "2026-09-01",
  startTime: "10:00",
  endTime: "11:00",
  attendance: 15,
  room: "seminar-201",
  hasFood: false,
  externalGuests: false,
  itNeeds: false,
};

const FEEDBACK = "Looks good — room is clear that morning.";

describe("approval flow (#87)", () => {
  beforeEach(async () => {
    await clearEmulator();
    await seedDatabase(getDb(), { reservations: [] });
  });

  it("creates a request, approves it with feedback, and lists it as Approved", async () => {
    const createdResponse = await handleCreateReservation(
      new Request("http://localhost/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(VALID),
      }),
    );
    assert.equal(createdResponse.status, 201);
    const created = (await createdResponse.json()) as EventRequest;
    assert.equal(created.status, "pending");
    assert.equal(created.history.length, 0);

    const { session } = await getAuthApi().signIn("admin@cea.howard.edu", "admin-demo");
    const approveResponse = await handleReviewPatch(
      new Request(`http://localhost/api/reservations/${created.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `${SESSION_COOKIE}=${encodeURIComponent(session.id)}`,
        },
        body: JSON.stringify({ decision: "approved", feedback: FEEDBACK }),
      }),
      created.id,
    );
    assert.equal(approveResponse.status, 200);
    const approved = (await approveResponse.json()) as EventRequest;
    assert.equal(approved.status, "approved");
    assert.equal(approved.history.length, 1);
    assert.equal(approved.history[0]?.from, "pending");
    assert.equal(approved.history[0]?.to, "approved");
    assert.equal(approved.history[0]?.actor, "Demo Admin");
    assert.equal(approved.history[0]?.feedback, FEEDBACK);

    const listResponse = await handleListReservations(
      new Request("http://localhost/api/reservations"),
    );
    assert.equal(listResponse.status, 200);
    const listed = (await listResponse.json()) as EventRequest[];
    const row = listed.find((entry) => entry.id === created.id);
    assert.ok(row);
    assert.equal(row.status, "approved");
    assert.equal(row.history.length, 1);
    assert.equal(row.history[0]?.actor, "Demo Admin");
    assert.equal(row.history[0]?.feedback, FEEDBACK);
  });
});
