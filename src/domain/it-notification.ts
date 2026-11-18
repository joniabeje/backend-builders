// When to notify IT on approval, and which details to send (#42).
import type { NotificationDetails } from "./notifications";
import type { EventRequest } from "./reservation";
import type { ReviewDecision } from "./review-decision";

/** Approved requests that asked for IT/AV get exactly one IT notification (#42). */
export function shouldNotifyItOnApprove(
  reservation: Pick<EventRequest, "itNeeds">,
  decision: ReviewDecision,
): boolean {
  return decision === "approved" && reservation.itNeeds;
}

/**
 * Payload for `notify("it", …)`: date, time, room, and requested equipment.
 * `roomLabel` should be the human-readable room name when available.
 */
export function itNotificationDetails(
  reservation: Pick<EventRequest, "date" | "startTime" | "endTime" | "room">,
  roomLabel: string = reservation.room,
): NotificationDetails {
  return {
    date: reservation.date,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    room: roomLabel,
    equipment: "IT/AV equipment",
  };
}
