import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EventRequest } from "../domain/reservation.ts";
import { MOCK_REQUESTS } from "./mock-requests.ts";
import { riskScore, type RiskInput } from "./risk-score.ts";

const quiet: RiskInput = {
  attendance: 20,
  externalGuests: false,
  afterHours: false,
  hasFood: false,
};

describe("riskScore", () => {
  it("keeps the current mock requests in the same bands", () => {
    const levels = Object.fromEntries(
      MOCK_REQUESTS.map((request) => [request.id, riskScore(request).level]),
    );
    assert.deepEqual(levels, {
      "REQ-1042": "medium",
      "REQ-1041": "high",
      "REQ-1040": "low",
      "REQ-1039": "high",
      "REQ-1038": "low",
    });
  });

  it("names the 75-attendee point that used to be silent", () => {
    const nsbe = MOCK_REQUESTS.find((request) => request.id === "REQ-1042");
    assert.ok(nsbe);
    assert.deepEqual(riskScore(nsbe).reasons, [
      "Elevated attendance",
      "After-hours",
      "Food service",
    ]);
  });

  it("treats 150 attendees plus two service flags as high", () => {
    const assessment = riskScore({
      attendance: 150,
      externalGuests: false,
      afterHours: true,
      hasFood: true,
    });
    assert.equal(assessment.level, "high");
    assert.deepEqual(assessment.reasons, ["Large attendance", "After-hours", "Food service"]);
  });

  it("returns high risk instead of throwing when attendance is unusable", () => {
    for (const attendance of [Number.NaN, -1, 10.5, Number.POSITIVE_INFINITY]) {
      const assessment = riskScore({ ...quiet, attendance });
      assert.equal(assessment.level, "high");
      assert.deepEqual(assessment.reasons, ["Attendance is missing or not a whole number"]);
    }
  });

  it("returns high risk when a flag is missing", () => {
    const broken = { ...quiet, afterHours: undefined } as unknown as EventRequest;
    const assessment = riskScore(broken);
    assert.equal(assessment.level, "high");
    assert.deepEqual(assessment.reasons, ["Risk flags are missing or not true/false"]);
  });
});
