// Pure access rules for the /admin route guard (#61).
import type { PublicUser } from "./auth";

export type AdminAccess = "ok" | "login" | "forbidden";

/** Signed-out users must log in; only the admin role may open /admin. */
export function adminAccess(user: PublicUser | null): AdminAccess {
  if (!user) return "login";
  if (user.role !== "admin") return "forbidden";
  return "ok";
}
