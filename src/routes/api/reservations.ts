import { createFileRoute } from "@tanstack/react-router";
import { handleCreateReservation, handleListReservations } from "@/server/reservations-http.server";

export const Route = createFileRoute("/api/reservations")({
  server: {
    handlers: {
      GET: async ({ request }) => handleListReservations(request),
      POST: async ({ request }) => handleCreateReservation(request),
    },
  },
});
