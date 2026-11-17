import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { DefaultErrorComponent } from "@/components/DefaultErrorComponent";
import { Toaster } from "@/components/ui/sonner";
import { createReservationRepository } from "@/data/create-reservation-repository";
import { ReservationRepositoryContext } from "@/data/reservation-repository-context";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // Composition root. Created per router instance (one per SSR request, one per browser
  // session) so no reservation state is shared between server requests. Default is the
  // HTTP API (#57); VITE_USE_MOCKS=true keeps the in-memory store for Playwright/Lovable.
  const queryClient = new QueryClient();
  const reservationRepository = createReservationRepository();

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
