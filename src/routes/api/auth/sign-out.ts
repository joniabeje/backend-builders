import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, json } from "@/server/api.server";
import { getAuthApi } from "@/server/auth.server";
import { clearSessionCookieHeader, readCookie, SESSION_COOKIE } from "@/server/cookies.server";

export const Route = createFileRoute("/api/auth/sign-out")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await getAuthApi().signOut(readCookie(request, SESSION_COOKIE));
          return json({ ok: true }, 200, { headers: { "Set-Cookie": clearSessionCookieHeader() } });
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
