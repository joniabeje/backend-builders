import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { MOCK_REQUESTS } from "@/lib/mock-requests";
import type { RequestStatus } from "./reservation";
import {
  STATUS_FILTERS,
  countByStatus,
  countRequiringReview,
  filterByStatus,
} from "./reservation-summary";
import { withRisk } from "./risk";

const REQUESTS = MOCK_REQUESTS.map(withRisk);
const withStatus = (status: RequestStatus) => ({ status });

describe("countByStatus", () => {
  it("counts each status and reports 0 for statuses with no requests", () => {
    assert.deepEqual(countByStatus([withStatus("pending"), withStatus("pending")]), {
      pending: 2,
      approved: 0,
      "needs-changes": 0,
      rejected: 0,
    });
  });

  it("adds up to the number of requests", () => {
    const counts = countByStatus(REQUESTS);
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    assert.equal(total, REQUESTS.length);
  });

  it("returns all zeros for an empty list", () => {
    assert.deepEqual(Object.values(countByStatus([])), [0, 0, 0, 0]);
  });
});

describe("countRequiringReview", () => {
  it("counts only requests the risk rules flag for review", () => {
    const expected = REQUESTS.filter((request) => request.risk.level === "high").length;
    assert.ok(expected > 0, "the seed data should include a high-risk request");
    assert.equal(countRequiringReview(REQUESTS), expected);
  });

  it("returns 0 when nothing needs review", () => {
    const lowRisk = REQUESTS.filter((request) => !request.risk.requiresReview);
    assert.equal(countRequiringReview(lowRisk), 0);
  });
});

describe("filterByStatus", () => {
  const requests = [
    { id: "A", status: "pending" as const },
    { id: "B", status: "approved" as const },
    { id: "C", status: "pending" as const },
  ];

  it("keeps every request, in order, for 'all'", () => {
    assert.deepEqual(
      filterByStatus(requests, "all").map((r) => r.id),
      ["A", "B", "C"],
    );
  });

  it("keeps only the matching status", () => {
    assert.deepEqual(
      filterByStatus(requests, "pending").map((r) => r.id),
      ["A", "C"],
    );
    assert.deepEqual(filterByStatus(requests, "rejected"), []);
  });

  it("returns a new array so callers can sort it safely", () => {
    assert.notEqual(filterByStatus(requests, "all"), requests);
  });

  it("offers 'all' first, then every status", () => {
    assert.deepEqual(STATUS_FILTERS, ["all", "pending", "approved", "needs-changes", "rejected"]);
  });
});
