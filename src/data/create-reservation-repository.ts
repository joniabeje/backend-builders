// Composition helper for src/router.tsx (#57). Keeps the mock switch in one place.
import { MOCK_REQUESTS } from "@/lib/mock-requests";
import { ApiReservationRepository } from "./api-reservation-repository";
import { InMemoryReservationRepository } from "./in-memory-reservation-repository";
import type { ReservationRepository } from "./reservation-repository";

export type ReservationRepositoryEnv = {
  VITE_USE_MOCKS?: string;
};

/**
 * The live app uses the HTTP API. Set `VITE_USE_MOCKS=true` for Playwright, Lovable
 * preview, or any environment without Firestore (docs/ARCHITECTURE.md).
 */
export function createReservationRepository(
  env: ReservationRepositoryEnv = import.meta.env,
): ReservationRepository {
  if (isUsingMockReservations(env)) {
    return new InMemoryReservationRepository(MOCK_REQUESTS);
  }
  return new ApiReservationRepository();
}

export function isUsingMockReservations(env: ReservationRepositoryEnv = import.meta.env): boolean {
  return env.VITE_USE_MOCKS === "true";
}
