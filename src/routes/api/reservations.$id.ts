import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, json, readReviewInput } from "@/server/api.server";
import { getReservationsApi } from "@/server/reservations.server";

export const Route = createFileRoute("/api/reservations/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          return json(await getReservationsApi().getReservation(params.id));
        } catch (error) {
          return errorResponse(error);
        }
      },
      PATCH: async ({ request, params }) => {
        try {
          const input = await readReviewInput(request);
          const updated = await getReservationsApi().reviewReservation(params.id, input);
          return json(updated);
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
