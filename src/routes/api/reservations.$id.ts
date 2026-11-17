import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, json, readReviewInput } from "@/server/api.server";
import { getAuthApi } from "@/server/auth.server";
import { readCookie, SESSION_COOKIE } from "@/server/cookies.server";
import { getDb } from "@/server/firestore.server";
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
      PATCH: async ({ request, params }) => {
        try {
          // Server-side session check — the /admin UI guard is not enough (#62).
          const { user } = await getAuthApi().requireAdmin(readCookie(request, SESSION_COOKIE));
          const input = await readReviewInput(request);
          const updated = await new ReservationsApi(getDb(), {
            reviewer: user.name,
          }).reviewReservation(params.id, input);
          return json(updated);
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
