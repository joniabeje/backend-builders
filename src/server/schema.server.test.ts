import { describe, it } from "vitest";
import assert from "node:assert/strict";
import type { EventRequest, StatusChange } from "@/domain/reservation";
import { withRisk } from "@/domain/risk";
import { MOCK_REQUESTS } from "@/lib/mock-requests";
import { ROOMS } from "@/lib/rooms";
import {
  CorruptDocumentError,
  fromReservationDoc,
  toReservationDoc,
  toRoomDoc,
  type ReservationDoc,
} from "./schema.server";

const REQUEST: EventRequest = withRisk(MOCK_REQUESTS[0]);

const entry = (at: string, to: StatusChange["to"] = "approved"): StatusChange => ({
  from: "pending",
  to,
  actor: "Dean's Office",
  at,
});

describe("reservation documents", () => {
  it("stores everything except the id and history, plus the requester id", () => {
    const doc = toReservationDoc(REQUEST, "user-1");
    assert.equal("id" in doc, false);
    assert.equal("history" in doc, false);
    assert.equal(doc.requesterId, "user-1");
    assert.deepEqual(doc.risk, REQUEST.risk);
  });

  it("defaults the requester id to null until sign-in exists", () => {
    assert.equal(toReservationDoc(REQUEST).requesterId, null);
  });

  it("round-trips back to the same reservation", () => {
    const history = [entry("2026-04-28T10:00:00.000Z")];
    const stored = toReservationDoc({ ...REQUEST, history });
    assert.deepEqual(fromReservationDoc(REQUEST.id, stored, history), { ...REQUEST, history });
  });

  it("returns history oldest first whatever order it was read in", () => {
    const later = entry("2026-04-29T09:00:00.000Z", "rejected");
    const earlier = entry("2026-04-28T10:00:00.000Z", "needs-changes");
    const result = fromReservationDoc(REQUEST.id, toReservationDoc(REQUEST), [later, earlier]);
    assert.deepEqual(
      result.history.map((change) => change.to),
      ["needs-changes", "rejected"],
    );
  });

  it("refuses a document with an unknown status instead of showing it", () => {
    const corrupt = {
      ...toReservationDoc(REQUEST),
      status: "archived",
    } as unknown as ReservationDoc;
    assert.throws(() => fromReservationDoc(REQUEST.id, corrupt), CorruptDocumentError);
  });

  it("refuses history with an unknown status", () => {
    const bad = { ...entry("2026-04-28T10:00:00.000Z"), to: "archived" } as unknown as StatusChange;
    assert.throws(
      () => fromReservationDoc(REQUEST.id, toReservationDoc(REQUEST), [bad]),
      CorruptDocumentError,
    );
  });
});

describe("room documents", () => {
  it("keeps the catalog fields and drops the client-side image", () => {
    const doc = toRoomDoc(ROOMS[0]);
    assert.deepEqual(Object.keys(doc).sort(), [
      "building",
      "capacity",
      "features",
      "floor",
      "name",
    ]);
    assert.equal(doc.capacity, ROOMS[0].capacity);
  });

  it("copies the features list so later edits don't leak into the catalog", () => {
    const doc = toRoomDoc(ROOMS[0]);
    doc.features.push("Changed");
    assert.equal(ROOMS[0].features.includes("Changed"), false);
  });
});
