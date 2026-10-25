import { createContext, useContext } from "react";
import type { ReservationRepository } from "./reservation-repository";

/** Provided once in src/router.tsx, which chooses the repository implementation. */
export const ReservationRepositoryContext = createContext<ReservationRepository | null>(null);

export function useReservationRepository(): ReservationRepository {
  const repository = useContext(ReservationRepositoryContext);
  if (!repository) {
    throw new Error("useReservationRepository must be used inside <ReservationRepositoryContext>.");
  }
  return repository;
}
