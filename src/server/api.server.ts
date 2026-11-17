// Shared HTTP helpers for the /api server routes (#55, #60).
import {
  ReservationConflictError,
  ReservationNotFoundError,
  ReservationValidationError,
} from "@/data/reservation-repository";
import type { NewReservation } from "@/domain/reservation";
import { ReviewFeedbackError, type ReviewInput } from "@/domain/review-decision";
import { InvalidCredentialsError, UnauthorizedError } from "./auth.server";

export function json(data: unknown, status = 200, init: ResponseInit = {}): Response {
  return Response.json(data, { ...init, status });
}

/** Maps domain errors from ReservationsApi / AuthApi to HTTP responses. */
export function errorResponse(error: unknown): Response {
  if (error instanceof ReservationValidationError) {
    return json({ error: error.message, issues: error.issues }, 400);
  }
  if (error instanceof ReviewFeedbackError) {
    return json({ error: error.message }, 400);
  }
  if (error instanceof ReservationConflictError) {
    return json(
      {
        error: error.message,
        conflicts: error.conflicts.map((conflict) => ({
          id: conflict.id,
          room: conflict.room,
          date: conflict.date,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
          status: conflict.status,
        })),
      },
      409,
    );
  }
  if (error instanceof ReservationNotFoundError) {
    return json({ error: error.message }, 404);
  }
  if (error instanceof InvalidCredentialsError || error instanceof UnauthorizedError) {
    return json({ error: error.message }, 401);
  }
  if (error instanceof TypeError) {
    return json({ error: error.message }, 400);
  }
  console.error(error);
  return json({ error: "Internal server error." }, 500);
}

const NEW_RESERVATION_KEYS = [
  "title",
  "organization",
  "advisor",
  "advisorEmail",
  "advisorApproved",
  "purpose",
  "date",
  "startTime",
  "endTime",
  "attendance",
  "room",
  "hasFood",
  "externalGuests",
  "itNeeds",
] as const satisfies readonly (keyof NewReservation)[];

/**
 * Reads a create body. Only NewReservation fields are kept; id, status, risk and
 * requester from the client are ignored.
 */
export async function readNewReservation(request: Request): Promise<NewReservation> {
  const body = await readJsonObject(request);
  const attendance = body.attendance;
  if (typeof attendance !== "number" || !Number.isInteger(attendance)) {
    throw new TypeError("attendance must be a whole number.");
  }
  for (const key of NEW_RESERVATION_KEYS) {
    if (key === "attendance") continue;
    if (
      key === "advisorApproved" ||
      key === "hasFood" ||
      key === "externalGuests" ||
      key === "itNeeds"
    ) {
      if (typeof body[key] !== "boolean") throw new TypeError(`${key} must be a boolean.`);
      continue;
    }
    if (typeof body[key] !== "string") throw new TypeError(`${key} must be a string.`);
  }
  return {
    title: body.title as string,
    organization: body.organization as string,
    advisor: body.advisor as string,
    advisorEmail: body.advisorEmail as string,
    advisorApproved: body.advisorApproved as boolean,
    purpose: body.purpose as string,
    date: body.date as string,
    startTime: body.startTime as string,
    endTime: body.endTime as string,
    attendance,
    room: body.room as string,
    hasFood: body.hasFood as boolean,
    externalGuests: body.externalGuests as boolean,
    itNeeds: body.itNeeds as boolean,
  };
}

export async function readReviewInput(request: Request): Promise<ReviewInput> {
  const body = await readJsonObject(request);
  if (typeof body.decision !== "string") throw new TypeError("decision must be a string.");
  if (typeof body.feedback !== "string") throw new TypeError("feedback must be a string.");
  return { decision: body.decision as ReviewInput["decision"], feedback: body.feedback };
}

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new TypeError("Request body must be JSON.");
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new TypeError("Request body must be a JSON object.");
  }
  return body as Record<string, unknown>;
}
