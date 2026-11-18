// Browser/client repository that talks to the /api routes from #55 (#57).
import type { EventRequest, NewReservation } from "@/domain/reservation";
import type { ValidationIssue } from "@/domain/reservation-validation";
import type { ReviewInput } from "@/domain/review-decision";
import type { BookedSlot } from "@/domain/room-availability";
import {
  ReservationConflictError,
  ReservationNotFoundError,
  ReservationValidationError,
  type ReservationRepository,
} from "./reservation-repository";

export type ApiReservationRepositoryOptions = {
  /** Override for tests. Defaults to the global fetch. */
  fetch?: typeof fetch;
  /** Prefix for API paths, e.g. "" in the browser or "http://127.0.0.1:4173" in tests. */
  baseUrl?: string;
};

/**
 * ReservationRepository backed by the TanStack Start /api routes. Same errors as the
 * in-memory store so hooks and pages do not change.
 */
export class ApiReservationRepository implements ReservationRepository {
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor({ fetch: fetchImpl = fetch, baseUrl = "" }: ApiReservationRepositoryOptions = {}) {
    this.fetchImpl = fetchImpl;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async list(): Promise<EventRequest[]> {
    const response = await this.fetchImpl(this.url("/api/reservations"), {
      credentials: "include",
    });
    return (await readBody(response)) as EventRequest[];
  }

  async listMine(): Promise<EventRequest[]> {
    const response = await this.fetchImpl(this.url("/api/reservations?requester=me"), {
      credentials: "include",
    });
    return (await readBody(response)) as EventRequest[];
  }

  async create(input: NewReservation): Promise<EventRequest> {
    const response = await this.fetchImpl(this.url("/api/reservations"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    return (await readBody(response)) as EventRequest;
  }

  async review(id: string, input: ReviewInput): Promise<EventRequest> {
    const response = await this.fetchImpl(this.url(`/api/reservations/${encodeURIComponent(id)}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    return (await readBody(response)) as EventRequest;
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }
}

type ErrorBody = {
  error?: string;
  issues?: ValidationIssue[];
  conflicts?: BookedSlot[];
};

async function readBody(response: Response): Promise<unknown> {
  let body: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      throw new Error(`API returned non-JSON (HTTP ${response.status}).`);
    }
  }

  if (response.ok) return body;

  const errorBody = (body ?? {}) as ErrorBody;
  if (response.status === 409) {
    throw new ReservationConflictError(errorBody.conflicts ?? []);
  }
  if (response.status === 404) {
    const idMatch = /Reservation (.+) was not found/.exec(errorBody.error ?? "");
    throw new ReservationNotFoundError(idMatch?.[1] ?? "unknown");
  }
  if (response.status === 400 && Array.isArray(errorBody.issues)) {
    throw new ReservationValidationError(errorBody.issues);
  }
  if (response.status === 400 && typeof errorBody.error === "string") {
    throw new TypeError(errorBody.error);
  }
  throw new Error(errorBody.error ?? `API request failed (HTTP ${response.status}).`);
}
