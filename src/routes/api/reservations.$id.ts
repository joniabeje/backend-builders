import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, json } from "@/server/api.server";
import { getDb } from "@/server/firestore.server";
import { handleReviewPatch } from "@/server/review-http.server";
import { ReservationsApi } from "@/server/reservations.server";

export const Route = createFileRoute("/api/reservations/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          return json(await new ReservationsApi(getDb()).getReservation(params.id));
        } catch (error) {
          return errorResponse(error);
        }
      },
      PATCH: async ({ request, params }) => handleReviewPatch(request, params.id),
    },
  },
});
