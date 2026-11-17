import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, json, readNewReservation } from "@/server/api.server";
import { getReservationsApi } from "@/server/reservations.server";

export const Route = createFileRoute("/api/reservations")({
  server: {
    handlers: {
      GET: async () => {
        try {
          return json(await getReservationsApi().listReservations());
        } catch (error) {
          return errorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const input = await readNewReservation(request);
          const created = await getReservationsApi().createReservation(input);
          return json(created, 201);
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
