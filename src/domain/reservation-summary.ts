// Counts and filters over a list of reservations, shared by /admin and /dashboard (#81).
//
// Framework-free like the other domain modules, so the analytics endpoint (#51) can
// reuse the same definitions of "pending" and "requires review".
import { REQUEST_STATUSES, type EventRequest, type RequestStatus } from "./reservation";

export const STATUS_FILTERS = ["all", ...REQUEST_STATUSES] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number];

/** Number of requests in each status. Every status is present, with 0 when none match. */
export function countByStatus(
  requests: readonly Pick<EventRequest, "status">[],
): Record<RequestStatus, number> {
  const counts = Object.fromEntries(REQUEST_STATUSES.map((status) => [status, 0])) as Record<
    RequestStatus,
    number
  >;
  for (const request of requests) counts[request.status] += 1;
  return counts;
}

/** Requests the risk rules flag for additional Dean's Office review (#5). */
export function countRequiringReview(requests: readonly Pick<EventRequest, "risk">[]): number {
  return requests.filter((request) => request.risk.requiresReview).length;
}

export function filterByStatus<T extends Pick<EventRequest, "status">>(
  requests: readonly T[],
  filter: StatusFilter,
): T[] {
  return filter === "all" ? [...requests] : requests.filter((request) => request.status === filter);
}
