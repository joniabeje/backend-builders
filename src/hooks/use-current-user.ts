// Current session for chrome that depends on role (#89). Uses the same server
// function as the /admin guard so VITE_USE_MOCKS still resolves to the demo admin.
import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUser } from "@/data/fetch-current-user";

export const currentUserQueryKey = ["current-user"] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: () => fetchCurrentUser(),
  });
}
