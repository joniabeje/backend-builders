// Which header links to show for the signed-in role (#89, #38).
import { adminAccess } from "./admin-access";
import type { PublicUser } from "./auth";

export type SiteNavLink = {
  readonly to: "/" | "/rooms" | "/dashboard" | "/admin" | "/admin/analytics";
  readonly label: string;
};

const PUBLIC_LINKS: readonly SiteNavLink[] = [
  { to: "/", label: "Home" },
  { to: "/rooms", label: "Rooms" },
];

const MY_REQUESTS_LINK: SiteNavLink = { to: "/dashboard", label: "My Requests" };
const ADMIN_LINK: SiteNavLink = { to: "/admin", label: "Admin" };
const ANALYTICS_LINK: SiteNavLink = { to: "/admin/analytics", label: "Analytics" };

/**
 * Home / Rooms for everyone. My Requests only when signed in (#38).
 * Admin + Analytics only when `adminAccess` is ok (#89 / #52).
 */
export function siteNavLinks(user: PublicUser | null): readonly SiteNavLink[] {
  if (!user) return PUBLIC_LINKS;
  if (adminAccess(user) === "ok") {
    return [...PUBLIC_LINKS, MY_REQUESTS_LINK, ADMIN_LINK, ANALYTICS_LINK];
  }
  return [...PUBLIC_LINKS, MY_REQUESTS_LINK];
}
