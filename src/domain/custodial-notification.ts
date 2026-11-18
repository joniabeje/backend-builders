// When to notify custodial on approval, and which details to send (#44 / #45).
import type { NotificationDetails } from "./notifications";
import type { EventRequest } from "./reservation";
import type { ReviewDecision } from "./review-decision";
import { RISK_POLICY } from "./risk";

/** Pre-event setup and post-event cleaning — one notify row each (#45). */
export const CUSTODIAL_PHASES = ["setup", "cleanup"] as const;

export type CustodialPhase = (typeof CUSTODIAL_PHASES)[number];

const PHASE_TASK: Record<CustodialPhase, string> = {
  setup: "Pre-event setup",
  cleanup: "Post-event cleaning",
};

/** Approved requests with food or large attendance get custodial notifications (#44). */
export function shouldNotifyCustodialOnApprove(
  reservation: Pick<EventRequest, "hasFood" | "attendance">,
  decision: ReviewDecision,
): boolean {
  if (decision !== "approved") return false;
  return reservation.hasFood || reservation.attendance >= RISK_POLICY.largeAttendance;
}

/**
 * Human-readable reasons for the custodial alert (food and/or large attendance).
 * Uses `RISK_POLICY.largeAttendance` so the threshold is not duplicated.
 */
export function custodialNotifyReasons(
  reservation: Pick<EventRequest, "hasFood" | "attendance">,
): string[] {
  const reasons: string[] = [];
  if (reservation.hasFood) reasons.push("Food service");
  if (reservation.attendance >= RISK_POLICY.largeAttendance) {
    reasons.push(`Large attendance (${RISK_POLICY.largeAttendance}+)`);
  }
  return reasons;
}

/**
 * Payload for one custodial phase (`setup` or `cleanup`): date, time, room,
 * attendance, reason, and the phase task label (#45).
 * `roomLabel` should be the human-readable room name when available.
 */
export function custodialNotificationDetails(
  reservation: Pick<
    EventRequest,
    "date" | "startTime" | "endTime" | "room" | "attendance" | "hasFood"
  >,
  phase: CustodialPhase,
  roomLabel: string = reservation.room,
): NotificationDetails {
  return {
    phase,
    task: PHASE_TASK[phase],
    date: reservation.date,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    room: roomLabel,
    attendance: String(reservation.attendance),
    reason: custodialNotifyReasons(reservation).join("; "),
  };
}
