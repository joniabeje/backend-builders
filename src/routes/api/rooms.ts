import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, json } from "@/server/api.server";
import { getReservationsApi } from "@/server/reservations.server";

export const Route = createFileRoute("/api/rooms")({
  server: {
    handlers: {
      GET: async () => {
        try {
          return json(await getReservationsApi().listRooms());
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
