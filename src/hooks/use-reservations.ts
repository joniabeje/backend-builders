import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useReservationRepository } from "@/data/reservation-repository-context";
import type { EventRequest } from "@/domain/reservation";
import type { ReviewInput } from "@/domain/review-decision";

const reservationKeys = {
  all: ["reservations"] as const,
  list: () => [...reservationKeys.all, "list"] as const,
};

export function useReservations() {
  const repository = useReservationRepository();
  return useQuery({
    queryKey: reservationKeys.list(),
    queryFn: () => repository.list(),
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
