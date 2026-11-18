import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { fetchCurrentUser } from "@/data/fetch-current-user";
import { adminAccess } from "@/domain/admin-access";

/** Layout for /admin and /admin/analytics — shared admin-only guard (#61 / #52). */
export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    const user = await fetchCurrentUser();
    const access = adminAccess(user);
    if (access === "login") {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    if (access === "forbidden") {
      throw redirect({ to: "/login", search: { error: "forbidden" } });
    }
    return { user };
  },
  component: () => <Outlet />,
});
