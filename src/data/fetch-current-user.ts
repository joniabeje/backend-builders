// Server function used by route guards (#61). Handler-only imports keep firebase-admin
// out of the browser bundle.
import { createServerFn } from "@tanstack/react-start";
import type { PublicUser } from "@/domain/auth";

/** Used when VITE_USE_MOCKS=true so Playwright can open /admin without Firestore. */
export const MOCK_ADMIN_USER: PublicUser = {
  id: "admin",
  email: "admin@cea.howard.edu",
  name: "Demo Admin",
  role: "admin",
};

export const fetchCurrentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicUser | null> => {
    if (import.meta.env.VITE_USE_MOCKS === "true") return MOCK_ADMIN_USER;

    const { getCookie } = await import("@tanstack/react-start/server");
    const { SESSION_COOKIE } = await import("@/server/cookies.server");
    const { getAuthApi } = await import("@/server/auth.server");

    try {
      const { user } = await getAuthApi().requireSession(getCookie(SESSION_COOKIE) ?? null);
      return user;
    } catch (error) {
      if (error instanceof Error && error.name === "UnauthorizedError") return null;
      throw error;
    }
  },
);
