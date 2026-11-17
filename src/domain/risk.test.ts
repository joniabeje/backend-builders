import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MOCK_REQUESTS } from "../lib/mock-requests.ts";
import {
  computeRisk,
  isAfterHours,
  RISK_POLICY,
  scoreRisk,
  withRisk,
  type RiskFacts,
  type RiskInput,
} from "./risk.ts";
import { parseTimeOfDay } from "./time-of-day.ts";

const at = (hhmm: string) => parseTimeOfDay(hhmm) ?? assert.fail(hhmm);

const QUIET: RiskInput = {
  attendance: 20,
  startTime: "12:00",
  endTime: "13:00",
  externalGuests: false,
  hasFood: false,
};

const NO_FACTORS: RiskFacts = {
  attendance: 20,
  externalGuests: false,
  afterHours: false,
  hasFood: false,
};

const codes = (input: Partial<RiskInput>) =>
  computeRisk({ ...QUIET, ...input }).factors.map((factor) => factor.code);

describe("isAfterHours", () => {
  it("is false inside the 08:00 start and 18:00 / 20:00 cutoffs", () => {
    assert.equal(isAfterHours(at("08:00"), at("17:59")), false);
    assert.equal(isAfterHours(at("17:59"), at("19:59")), false);
  });

  it("flags early starts, late starts, early ends, and late ends", () => {
    assert.equal(isAfterHours(at("07:59"), at("10:00")), true);
    assert.equal(isAfterHours(at("18:00"), at("19:00")), true);
    assert.equal(isAfterHours(at("12:00"), at("20:00")), true);
    assert.equal(isAfterHours(at("06:00"), at("07:30")), true);
  });
});

describe("computeRisk factors", () => {
  it("has no factors for a small daytime event", () => {
    const risk = computeRisk(QUIET);
    assert.deepEqual(risk, {
      level: "low",
      score: 0,
      factors: [],
      requiresReview: false,
      reviewReason: null,
    });
  });

  it("scores attendance in two bands at 75 and 150", () => {
    assert.deepEqual(codes({ attendance: 74 }), []);
    assert.deepEqual(codes({ attendance: 75 }), ["elevated-attendance"]);
    assert.deepEqual(codes({ attendance: 149 }), ["elevated-attendance"]);
    assert.deepEqual(codes({ attendance: 150 }), ["large-attendance"]);
    assert.equal(computeRisk({ ...QUIET, attendance: 75 }).score, 1);
    assert.equal(computeRisk({ ...QUIET, attendance: 150 }).score, 2);
  });

  it("flags external guests, and security staffing only from 50 attendees", () => {
    assert.deepEqual(codes({ externalGuests: true, attendance: 49 }), ["external-guests"]);
    assert.deepEqual(codes({ externalGuests: true, attendance: 50 }), [
      "external-guests",
      "security-staffing",
    ]);
    // Security staffing is informational: it does not add to the score.
    assert.equal(computeRisk({ ...QUIET, externalGuests: true, attendance: 50 }).score, 1);
  });

  it("derives after-hours from the start and end times", () => {
    assert.deepEqual(codes({ startTime: "18:00", endTime: "19:00" }), ["after-hours"]);
    assert.deepEqual(codes({ startTime: "17:00", endTime: "20:00" }), ["after-hours"]);
    assert.deepEqual(codes({ startTime: "17:00", endTime: "19:59" }), []);
  });

  it("flags food service", () => {
    assert.deepEqual(codes({ hasFood: true }), ["food-service"]);
  });

  it("gives every factor a reason string", () => {
    const risk = computeRisk({
      attendance: 200,
      startTime: "19:00",
      endTime: "22:00",
      externalGuests: true,
      hasFood: true,
    });
    assert.deepEqual(
      risk.factors.map((factor) => factor.reason),
      [
        "Large attendance (150+)",
        "External guests",
        "After-hours",
        "Food service",
        "Security staffing (external guests, 50+)",
      ],
    );
  });
});

describe("risk levels and review", () => {
  it("is low below 2 points, medium at 2 and 3, high at 4", () => {
    const levelAt = (facts: Partial<RiskFacts>) => scoreRisk({ ...NO_FACTORS, ...facts }).level;
    assert.equal(levelAt({ hasFood: true }), "low");
    assert.equal(levelAt({ hasFood: true, afterHours: true }), "medium");
    assert.equal(levelAt({ hasFood: true, afterHours: true, externalGuests: true }), "medium");
    assert.equal(
      levelAt({ hasFood: true, afterHours: true, externalGuests: true, attendance: 75 }),
      "high",
    );
    assert.equal(RISK_POLICY.mediumScore, 2);
    assert.equal(RISK_POLICY.highScore, 4);
  });

  it("requires review only for high risk, with a reason", () => {
    const medium = scoreRisk({ ...NO_FACTORS, attendance: 150, hasFood: true });
    assert.equal(medium.requiresReview, false);
    assert.equal(medium.reviewReason, null);

    const high = scoreRisk({ ...NO_FACTORS, attendance: 150, hasFood: true, afterHours: true });
    assert.equal(high.level, "high");
    assert.equal(high.requiresReview, true);
    assert.equal(high.reviewReason, "Risk score 4 meets the high-risk threshold of 4");
  });
});

describe("computeRisk with unusable data", () => {
  it("returns high risk needing review instead of throwing on bad attendance", () => {
    for (const attendance of [Number.NaN, -1, 10.5, Number.POSITIVE_INFINITY]) {
      const risk = computeRisk({ ...QUIET, attendance });
      assert.equal(risk.level, "high");
      assert.equal(risk.requiresReview, true);
      assert.deepEqual(
        risk.factors.map((factor) => factor.reason),
        ["Attendance is missing or not a whole number"],
      );
    }
  });

  it("treats unparseable times as unusable rather than daytime", () => {
    const risk = computeRisk({ ...QUIET, startTime: "6pm" });
    assert.equal(risk.level, "high");
    assert.deepEqual(
      risk.factors.map((factor) => factor.reason),
      ["Start or end time is missing or not HH:mm"],
    );
  });

  it("flags missing boolean fields", () => {
    const broken = { ...QUIET, hasFood: undefined } as unknown as RiskInput;
    const risk = computeRisk(broken);
    assert.equal(risk.level, "high");
    assert.equal(risk.reviewReason, "Risk could not be scored from the request data");
    assert.deepEqual(
      risk.factors.map((factor) => factor.reason),
      ["Risk flags are missing or not true/false"],
    );
  });
});

describe("withRisk", () => {
  it("stores the computed risk without changing other fields", () => {
    const scored = withRisk(QUIET);
    assert.deepEqual(scored, { ...QUIET, risk: computeRisk(QUIET) });
  });

  it("keeps the seed requests in the same bands the admin table showed before #5", () => {
    const levels = Object.fromEntries(
      MOCK_REQUESTS.map((request) => [request.id, computeRisk(request).level]),
    );
    assert.deepEqual(levels, {
      "REQ-1042": "medium",
      "REQ-1041": "high",
      "REQ-1040": "low",
      "REQ-1039": "high",
      "REQ-1038": "low",
    });
  });
});
