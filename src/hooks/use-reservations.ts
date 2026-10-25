import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useReservationRepository } from "@/data/reservation-repository-context";
import type { EventRequest, RequestStatus } from "@/domain/reservation";

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

type StatusChange = { id: string; status: RequestStatus };

/**
 * Updates a reservation's status. The list updates immediately; if the repository
 * rejects, the previous list is restored and the user is told why.
 */
export function useUpdateReservationStatus() {
  const repository = useReservationRepository();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: StatusChange) => repository.updateStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: reservationKeys.list() });
      const previous = queryClient.getQueryData<EventRequest[]>(reservationKeys.list());
      queryClient.setQueryData<EventRequest[]>(reservationKeys.list(), (current) =>
        current?.map((reservation) =>
          reservation.id === id ? { ...reservation, status } : reservation,
        ),
      );
      return { previous };
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
