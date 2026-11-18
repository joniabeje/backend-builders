import { useQuery } from "@tanstack/react-query";
import { fetchRoomUsage } from "@/data/fetch-room-usage";

export function roomUsageQueryKey(from: string, to: string) {
  return ["analytics", "rooms", from, to] as const;
}

export function useRoomUsage(from: string, to: string) {
  return useQuery({
    queryKey: roomUsageQueryKey(from, to),
    queryFn: () => fetchRoomUsage(from, to),
    enabled: Boolean(from && to && from <= to),
  });
}
