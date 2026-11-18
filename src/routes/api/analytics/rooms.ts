import { createFileRoute } from "@tanstack/react-router";
import { handleRoomUsage } from "@/server/analytics-http.server";

export const Route = createFileRoute("/api/analytics/rooms")({
  server: {
    handlers: {
      GET: async ({ request }) => handleRoomUsage(request),
    },
  },
});
