// When to notify security on approval, and which details to send (#47 / #48).
import type { NotificationDetails } from "./notifications";
import type { EventRequest } from "./reservation";
import type { ReviewDecision } from "./review-decision";
import type { RiskAssessment, RiskFactor, RiskFactorCode } from "./risk";

/**
 * Risk factor codes that require security coverage on approve (#47 / #10).
 * After-hours comes from the stored `after-hours` factor (same as F10), not a
 * separate clock check here.
 */
export const SECURITY_TRIGGER_CODES = [
  "external-guests",
  "after-hours",
  "large-attendance",
  "security-staffing",
] as const satisfies readonly RiskFactorCode[];

export type SecurityTriggerCode = (typeof SECURITY_TRIGGER_CODES)[number];

function isSecurityTriggerCode(code: RiskFactorCode): code is SecurityTriggerCode {
  return (SECURITY_TRIGGER_CODES as readonly string[]).includes(code);
}

/** Factors on `reservation.risk` that should appear in a security notification. */
export function securityTriggerFactors(
  risk: Pick<RiskAssessment, "factors">,
): readonly RiskFactor[] {
  return risk.factors.filter((factor) => isSecurityTriggerCode(factor.code));
}

/** Approved requests whose stored risk includes a security trigger (#47). */
export function shouldNotifySecurityOnApprove(
  reservation: Pick<EventRequest, "risk">,
  decision: ReviewDecision,
): boolean {
  return decision === "approved" && securityTriggerFactors(reservation.risk).length > 0;
}

/**
 * Payload for `notify("security", …)`: date, time, room, attendance, and each
 * triggering factor's reason (#48).
 */
export function securityNotificationDetails(
  reservation: Pick<
    EventRequest,
    "date" | "startTime" | "endTime" | "room" | "attendance" | "risk"
  >,
  roomLabel: string = reservation.room,
): NotificationDetails {
  const reasons = securityTriggerFactors(reservation.risk).map((factor) => factor.reason);
  return {
    date: reservation.date,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    room: roomLabel,
    attendance: String(reservation.attendance),
    reasons: reasons.join("; "),
  };
}
