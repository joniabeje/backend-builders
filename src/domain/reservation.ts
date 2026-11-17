// Core reservation types, shared by the data layer and the UI.
// Kept free of mock data so a real API client can depend on them too.
import type { RiskAssessment } from "./risk";

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

/** One entry in a reservation's audit trail. `at` is an ISO-8601 timestamp. */
export type StatusChange = {
  from: RequestStatus;
  to: RequestStatus;
  actor: string;
  feedback?: string;
  at: string;
};

/**
 * `room` stores a stable ROOMS id (e.g. "atrium"), not a free-text label.
 * Display names come from getRoomDisplayName / getRoomById in rooms.ts.
 * `history` is oldest-first.
 * `risk` is computed once from the stored fields when the reservation is saved (#5),
 * so every page shows the same assessment. After-hours is part of it, derived from
 * `startTime` and `endTime`.
 */
export type EventRequest = {
  id: string;
  title: string;
  organization: string;
  /** Who submitted the request. A placeholder until accounts exist (#14). */
  requester: string;
  /** Faculty advisor's name, as entered on the form. */
  advisor: string;
  advisorEmail: string;
  purpose: string;
  date: string;
  startTime: string;
  endTime: string;
  attendance: number;
  room: string;
  status: RequestStatus;
  hasFood: boolean;
  externalGuests: boolean;
  itNeeds: boolean;
  submittedAt: string;
  history: readonly StatusChange[];
  risk: RiskAssessment;
};

/** A reservation before the store has scored it. Repositories add `risk` on save. */
export type UnscoredEventRequest = Omit<EventRequest, "risk">;

/**
 * What a requester submits (#2). The store assigns everything else: id, requester,
 * status, submittedAt, history and risk. Clients never send those.
 */
export type NewReservation = Pick<
  EventRequest,
  | "title"
  | "organization"
  | "advisor"
  | "advisorEmail"
  | "purpose"
  | "date"
  | "startTime"
  | "endTime"
  | "attendance"
  | "room"
  | "hasFood"
  | "externalGuests"
  | "itNeeds"
>;
