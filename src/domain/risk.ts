// Risk detection rules (issue #5). The single rule set for the reserve form, the
// repository, and the admin page.
//
// Framework-free like the rest of src/domain, so the reservation API (#13) can score
// requests on the server at submit time with this module unchanged.
import type { EventRequest } from "./reservation";
import { parseTimeOfDay } from "./time-of-day";

/**
 * CEA risk policy.
 *
 * These are defaults pending confirmation from the CEA policy owner (#5). They keep the
 * reserve form's existing after-hours window and the admin table's existing attendance
 * bands, so neither page changes behavior. Change them here only; the README documents
 * them under "Risk detection".
 */
export const RISK_POLICY = {
  /** Events starting or ending before 08:00 are after-hours. */
  dayStartMinutes: 8 * 60,
  /** Events starting at or after 18:00 are after-hours. */
  lateStartMinutes: 18 * 60,
  /** Events ending at or after 20:00 are after-hours. */
  lateEndMinutes: 20 * 60,
  /** 75 to 149 attendees add one point. */
  elevatedAttendance: 75,
  /** 150 or more attendees add two points. */
  largeAttendance: 150,
  /** External guests at this attendance or above need security staffing. Adds no points. */
  securityAttendance: 50,
  /** A score of 2 or 3 is medium risk. */
  mediumScore: 2,
  /** A score of 4 or more is high risk and requires additional review. */
  highScore: 4,
} as const;

export type RiskLevel = "low" | "medium" | "high";

export type RiskFactorCode =
  | "large-attendance"
  | "elevated-attendance"
  | "external-guests"
  | "after-hours"
  | "food-service"
  | "security-staffing"
  | "invalid-input";

export type RiskFactor = {
  code: RiskFactorCode;
  /** Contribution to the score. Informational factors add 0. */
  points: number;
  /** Short, admin-facing explanation. */
  reason: string;
};

export type RiskAssessment = {
  level: RiskLevel;
  score: number;
  /** In a fixed order: attendance, guests, after-hours, food, security. */
  factors: readonly RiskFactor[];
  /** True for high-risk requests: a human must review before approval. */
  requiresReview: boolean;
  /** Why review is required, or null when it is not. */
  reviewReason: string | null;
};

/** Facts the score is built from. `afterHours` is derived, never entered by hand. */
export type RiskFacts = {
  attendance: number;
  externalGuests: boolean;
  afterHours: boolean;
  hasFood: boolean;
};

/** The reservation fields computeRisk reads. A full EventRequest also fits. */
export type RiskInput = Pick<
  EventRequest,
  "attendance" | "startTime" | "endTime" | "externalGuests" | "hasFood"
>;

const INVALID_ATTENDANCE = "Attendance is missing or not a whole number";
const INVALID_TIMES = "Start or end time is missing or not HH:mm";
const INVALID_FLAGS = "Risk flags are missing or not true/false";
const INVALID_REVIEW_REASON = "Risk could not be scored from the request data";

/** True when an event (times in minutes since midnight) falls outside CEA building hours. */
export function isAfterHours(startMinutes: number, endMinutes: number): boolean {
  const { dayStartMinutes, lateStartMinutes, lateEndMinutes } = RISK_POLICY;
  return (
    startMinutes < dayStartMinutes ||
    startMinutes >= lateStartMinutes ||
    endMinutes < dayStartMinutes ||
    endMinutes >= lateEndMinutes
  );
}

/**
 * Scores already-parsed facts. Every factor only adds points, so scoring a partly
 * filled form (e.g. `afterHours: false` before times are entered) gives a lower bound.
 */
export function scoreRisk(facts: RiskFacts): RiskAssessment {
  const { elevatedAttendance, largeAttendance, securityAttendance } = RISK_POLICY;
  const factors: RiskFactor[] = [];

  if (facts.attendance >= largeAttendance) {
    factors.push({
      code: "large-attendance",
      points: 2,
      reason: `Large attendance (${largeAttendance}+)`,
    });
  } else if (facts.attendance >= elevatedAttendance) {
    factors.push({
      code: "elevated-attendance",
      points: 1,
      reason: `Elevated attendance (${elevatedAttendance}+)`,
    });
  }
  if (facts.externalGuests) {
    factors.push({ code: "external-guests", points: 1, reason: "External guests" });
  }
  if (facts.afterHours) {
    factors.push({ code: "after-hours", points: 1, reason: "After-hours" });
  }
  if (facts.hasFood) {
    factors.push({ code: "food-service", points: 1, reason: "Food service" });
  }
  if (facts.externalGuests && facts.attendance >= securityAttendance) {
    factors.push({
      code: "security-staffing",
      points: 0,
      reason: `Security staffing (external guests, ${securityAttendance}+)`,
    });
  }

  const score = factors.reduce((total, factor) => total + factor.points, 0);
  const level = levelFor(score);
  const requiresReview = level === "high";
  return {
    level,
    score,
    factors,
    requiresReview,
    reviewReason: requiresReview
      ? `Risk score ${score} meets the high-risk threshold of ${RISK_POLICY.highScore}`
      : null,
  };
}

/**
 * Risk for a stored or submitted reservation. After-hours is derived from the times.
 *
 * Does not throw: unusable data (bad attendance, unparseable times, non-boolean flags)
 * comes back as high risk with the problem as the reason, so it still gets a human look.
 */
export function computeRisk(request: RiskInput): RiskAssessment {
  const start = typeof request.startTime === "string" ? parseTimeOfDay(request.startTime) : null;
  const end = typeof request.endTime === "string" ? parseTimeOfDay(request.endTime) : null;

  const problems: string[] = [];
  if (!Number.isInteger(request.attendance) || request.attendance < 0) {
    problems.push(INVALID_ATTENDANCE);
  }
  if (start === null || end === null) problems.push(INVALID_TIMES);
  if (!isBoolean(request.externalGuests) || !isBoolean(request.hasFood)) {
    problems.push(INVALID_FLAGS);
  }
  if (problems.length > 0 || start === null || end === null) {
    return {
      level: "high",
      score: 0,
      factors: problems.map((reason) => ({ code: "invalid-input", points: 0, reason })),
      requiresReview: true,
      reviewReason: INVALID_REVIEW_REASON,
    };
  }

  return scoreRisk({
    attendance: request.attendance,
    externalGuests: request.externalGuests,
    hasFood: request.hasFood,
    afterHours: isAfterHours(start, end),
  });
}

/** Returns a copy of `request` with its risk computed and stored on it. */
export function withRisk<T extends RiskInput>(request: T): T & { risk: RiskAssessment } {
  return { ...request, risk: computeRisk(request) };
}

function levelFor(score: number): RiskLevel {
  if (score >= RISK_POLICY.highScore) return "high";
  if (score >= RISK_POLICY.mediumScore) return "medium";
  return "low";
}

function isBoolean(value: unknown): value is boolean {
  return value === true || value === false;
}
