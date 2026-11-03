import { AlertTriangle, Sparkles } from "lucide-react";
import { describeConflicts, type BookedSlot } from "@/domain/room-availability";
import type {
  PreferredRoomProblem,
  RoomRecommendationResult,
  UnsuitableReason,
} from "@/domain/room-recommendation";
import type { Room } from "@/lib/rooms";

function describeProblem(
  attendance: number,
  { room, reasons, conflicts, missingFeatures }: PreferredRoomProblem<Room, BookedSlot>,
): string {
  const parts: Record<UnsuitableReason, string> = {
    booked: `is booked at ${describeConflicts(conflicts)}`,
    "too-small": `holds ${room.capacity}, fewer than ${attendance} attendees`,
    "missing-features": `does not have ${missingFeatures.join(", ")}`,
  };
  return `${room.name} ${reasons.map((reason) => parts[reason]).join(" and ")}.`;
}

export function RoomRecommendations({
  attendance,
  result,
  availabilityChecked,
  selectedRoomId,
  onSelect,
}: {
  attendance: number;
  result: RoomRecommendationResult<Room, BookedSlot>;
  /** True only when the slot is complete and existing reservations have loaded. */
  availabilityChecked: boolean;
  selectedRoomId: string;
  onSelect: (roomId: string) => void;
}) {
  const { rooms, preferred } = result;
  if (attendance < 1 && !preferred) return null;

  return (
    <div className="mb-4 rounded-lg border border-gold/40 bg-gold/10 p-4">
      {preferred && (
        <div
          role="alert"
          className="mb-3 flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-foreground"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <span>
            {describeProblem(attendance, preferred)}{" "}
            {rooms.length > 0 ? "Try one of these instead." : ""}
          </span>
        </div>
      )}
      {attendance >= 1 && (
        <>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-gold-foreground" />
            {preferred ? "Alternatives" : "Recommended"} for {attendance} attendees
          </div>
          {!availabilityChecked && (
            <p className="mt-1 text-xs text-muted-foreground">
              Based on capacity and features. Pick a date and time to check bookings.
            </p>
          )}
          {rooms.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No room fits this request
              {availabilityChecked ? " at the selected time" : ""}. Try a different time, fewer
              required features, or a smaller attendance.
            </p>
          ) : (
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
          )}
        </>
      )}
    </div>
  );
}
