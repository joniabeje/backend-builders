export type RiskLevel = "low" | "medium" | "high";

export type RiskAssessment = {
  level: RiskLevel;
  reasons: string[];
};

/**
 * Fields the Dean's Office dashboard actually scores.
 * Callers may pass a full event request; extra fields are ignored.
 */
export type RiskInput = {
  attendance: number;
  externalGuests: boolean;
  afterHours: boolean;
  hasFood: boolean;
};

/**
 * CEA display policy already used by the admin table.
 * 75–149 attendees add one point. 150 or more adds two.
 * External guests, after-hours, and food each add one.
 * Two points is medium. Four points is high.
 */
const ELEVATED_ATTENDANCE = 75;
const LARGE_ATTENDANCE = 150;
const MEDIUM_SCORE = 2;
const HIGH_SCORE = 4;

const INVALID_ATTENDANCE = "Attendance is missing or not a whole number";
const INVALID_FLAGS = "Risk flags are missing or not true/false";

/**
 * Returns the risk badge for one request.
 * Invalid attendance or flags come back as high risk with a reason.
 * This is called while the admin table renders, so it does not throw.
 */
export function riskScore(request: RiskInput): RiskAssessment {
  const problems = inputProblems(request);
  if (problems.length > 0) {
    return { level: "high", reasons: problems };
  }

  const reasons: string[] = [];
  let score = 0;

  if (request.attendance >= LARGE_ATTENDANCE) {
    reasons.push("Large attendance");
    score += 2;
  } else if (request.attendance >= ELEVATED_ATTENDANCE) {
    reasons.push("Elevated attendance");
    score += 1;
  }

  if (request.externalGuests) {
    reasons.push("External guests");
    score += 1;
  }
  if (request.afterHours) {
    reasons.push("After-hours");
    score += 1;
  }
  if (request.hasFood) {
    reasons.push("Food service");
    score += 1;
  }

  const level: RiskLevel = score >= HIGH_SCORE ? "high" : score >= MEDIUM_SCORE ? "medium" : "low";
  return { level, reasons };
}

function inputProblems(request: RiskInput): string[] {
  const problems: string[] = [];
  if (!Number.isInteger(request.attendance) || request.attendance < 0) {
    problems.push(INVALID_ATTENDANCE);
  }
  if (
    !isBoolean(request.externalGuests) ||
    !isBoolean(request.afterHours) ||
    !isBoolean(request.hasFood)
  ) {
    problems.push(INVALID_FLAGS);
  }
  return problems;
}

function isBoolean(value: unknown): value is boolean {
  return value === true || value === false;
}
