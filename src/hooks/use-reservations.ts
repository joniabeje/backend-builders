import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ReservationRepository } from "@/data/reservation-repository";
import { useReservationRepository } from "@/data/reservation-repository-context";
import type { EventRequest, NewReservation } from "@/domain/reservation";
import type { ReviewInput } from "@/domain/review-decision";

const reservationKeys = {
  all: ["reservations"] as const,
  list: () => [...reservationKeys.all, "list"] as const,
};

/** How often an open page re-reads the list, so admin decisions reach /dashboard (#37). */
export const RESERVATIONS_REFRESH_INTERVAL_MS = 30_000;

/**
 * The reservation list query shared by /dashboard, /admin, /rooms and the form.
 * Refetches on an interval and when the tab regains focus; a hidden tab does not poll.
 */
export function reservationListQueryOptions(repository: ReservationRepository) {
  return queryOptions({
    queryKey: reservationKeys.list(),
    queryFn: () => repository.list(),
    refetchInterval: RESERVATIONS_REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

export function useReservations() {
  return useQuery(reservationListQueryOptions(useReservationRepository()));
}

/**
 * Saves a new request (#2). On success the new reservation is added to the cached list,
 * so /dashboard and /admin show it immediately, and the list is refetched. Errors are
 * left to the caller, which shows them next to the form so nothing typed is lost.
 */
export function useCreateReservation() {
  const repository = useReservationRepository();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: NewReservation) => repository.create(input),
    onSuccess: (created) => {
      queryClient.setQueryData<EventRequest[]>(reservationKeys.list(), (current) =>
        current ? [created, ...current] : current,
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: reservationKeys.all }),
  });
}

export type ReviewVariables = ReviewInput & { id: string };

/**
 * Records an admin decision. The status badge updates immediately; the history entry
 * comes from the repository, which owns the reviewer and timestamp. If the repository
 * rejects, the previous list is restored and the user is told why.
 */
export function useReviewReservation() {
  const repository = useReservationRepository();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: ReviewVariables) => repository.review(id, input),
    onMutate: async ({ id, decision }) => {
      await queryClient.cancelQueries({ queryKey: reservationKeys.list() });
      const previous = queryClient.getQueryData<EventRequest[]>(reservationKeys.list());
      queryClient.setQueryData<EventRequest[]>(reservationKeys.list(), (current) =>
        current?.map((reservation) =>
          reservation.id === id ? { ...reservation, status: decision } : reservation,
        ),
      );
      return { previous };
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<EventRequest[]>(reservationKeys.list(), (current) =>
        current?.map((reservation) => (reservation.id === updated.id ? updated : reservation)),
      );
    },
    onError: (error, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(reservationKeys.list(), context.previous);
      }
      console.error(`Failed to update reservation ${id}`, error);
      toast.error(`Could not update ${id}`, { description: error.message });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: reservationKeys.all }),
  });
}
