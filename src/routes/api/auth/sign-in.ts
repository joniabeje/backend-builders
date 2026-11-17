import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, json } from "@/server/api.server";
import { getAuthApi, SESSION_TTL_MS } from "@/server/auth.server";
import { sessionCookieHeader } from "@/server/cookies.server";

export const Route = createFileRoute("/api/auth/sign-in")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { email?: unknown; password?: unknown };
          if (typeof body.email !== "string" || typeof body.password !== "string") {
            throw new TypeError("email and password must be strings.");
          }
          const { session, user } = await getAuthApi().signIn(body.email, body.password);
          return json({ user }, 200, {
            headers: {
              "Set-Cookie": sessionCookieHeader(session.id, SESSION_TTL_MS / 1000),
            },
          });
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
