import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { DefaultErrorComponent } from "@/components/DefaultErrorComponent";
import { Toaster } from "@/components/ui/sonner";
import { InMemoryReservationRepository } from "@/data/in-memory-reservation-repository";
import { ReservationRepositoryContext } from "@/data/reservation-repository-context";
import { MOCK_REQUESTS } from "@/lib/mock-requests";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // Composition root. Created per router instance (one per SSR request, one per browser
  // session) so no reservation state is shared between server requests. Swap the
  // repository here when the reservation API exists (TD-01).
  const queryClient = new QueryClient();
  const reservationRepository = new InMemoryReservationRepository(MOCK_REQUESTS);

  const router = createRouter({
    routeTree,
    context: {},
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent,
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <ReservationRepositoryContext value={reservationRepository}>
          {children}
          <Toaster richColors />
        </ReservationRepositoryContext>
      </QueryClientProvider>
    ),
  });

  return router;
};
