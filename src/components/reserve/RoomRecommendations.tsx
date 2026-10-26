import { Sparkles } from "lucide-react";
import type { Room } from "@/lib/rooms";

export function RoomRecommendations({
  attendance,
  rooms,
  selectedRoomId,
  onSelect,
}: {
  attendance: number;
  rooms: readonly Room[];
  selectedRoomId: string;
  onSelect: (roomId: string) => void;
}) {
  if (rooms.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-gold/40 bg-gold/10 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="h-4 w-4 text-gold-foreground" /> Recommended for {attendance} attendees
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {rooms.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            className={`text-left rounded-md border p-3 text-sm transition-smooth ${selectedRoomId === r.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}
          >
            <div className="font-semibold text-foreground">{r.name}</div>
            <div className="text-xs text-muted-foreground">
              Cap. {r.capacity} · {r.building}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
