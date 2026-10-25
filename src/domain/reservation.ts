// Core reservation types, shared by the data layer and the UI.
// Kept free of mock data so a real API client can depend on them too.

export const REQUEST_STATUSES = ["pending", "approved", "needs-changes", "rejected"] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  "needs-changes": "Needs Changes",
};

export function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === "string" && (REQUEST_STATUSES as readonly string[]).includes(value);
}

/**
 * `room` stores a stable ROOMS id (e.g. "atrium"), not a free-text label.
 * Display names come from getRoomDisplayName / getRoomById in rooms.ts.
 */
export type EventRequest = {
  id: string;
  title: string;
  organization: string;
  requester: string;
  date: string;
  startTime: string;
  endTime: string;
  attendance: number;
  room: string;
  status: RequestStatus;
  hasFood: boolean;
  externalGuests: boolean;
  afterHours: boolean;
  itNeeds: boolean;
  submittedAt: string;
};
