// Client loader for GET /api/analytics/rooms (#52). Under VITE_USE_MOCKS, aggregates
// the in-memory seed so Playwright can open /admin/analytics without Firestore.
import { AuthClientError } from "./auth-client";
import { MOCK_REQUESTS } from "@/lib/mock-requests";
import { ROOMS } from "@/lib/rooms";
import { aggregateRoomUsage, type RoomUsageReport } from "@/domain/room-usage";

export async function fetchRoomUsage(from: string, to: string): Promise<RoomUsageReport> {
  if (import.meta.env.VITE_USE_MOCKS === "true") {
    return aggregateRoomUsage(
      MOCK_REQUESTS,
      { from, to },
      ROOMS.map((room) => room.id),
    );
  }

  const params = new URLSearchParams({ from, to });
  const response = await fetch(`/api/analytics/rooms?${params}`, {
    credentials: "include",
  });
  const body = (await response.json().catch(() => ({}))) as RoomUsageReport & {
    error?: string;
  };
  if (!response.ok) {
    throw new AuthClientError(body.error ?? "Could not load room usage.", response.status);
  }
  return body;
}
