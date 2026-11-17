import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, json } from "@/server/api.server";
import { getAuthApi } from "@/server/auth.server";
import { readCookie, SESSION_COOKIE } from "@/server/cookies.server";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { user } = await getAuthApi().requireSession(readCookie(request, SESSION_COOKIE));
          return json({ user });
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
