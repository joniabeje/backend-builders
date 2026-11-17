// Which header links to show for the signed-in role (#89).
import { adminAccess } from "./admin-access";
import type { PublicUser } from "./auth";

export type SiteNavLink = {
  readonly to: "/" | "/rooms" | "/dashboard" | "/admin";
  readonly label: string;
};

const BASE_LINKS: readonly SiteNavLink[] = [
  { to: "/", label: "Home" },
  { to: "/rooms", label: "Rooms" },
  { to: "/dashboard", label: "My Requests" },
];

const ADMIN_LINK: SiteNavLink = { to: "/admin", label: "Admin" };

/** Home / Rooms / My Requests for everyone; Admin only when `adminAccess` is ok. */
export function siteNavLinks(user: PublicUser | null): readonly SiteNavLink[] {
  if (adminAccess(user) === "ok") return [...BASE_LINKS, ADMIN_LINK];
  return BASE_LINKS;
}
