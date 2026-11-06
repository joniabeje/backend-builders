import { REQUEST_STATUS_LABELS, type StatusChange } from "@/domain/reservation";
import { StatusBadge } from "./StatusBadge";
import { STATUS_STYLES } from "./status-styles";

export type StatusTimelineProps = { entries: readonly StatusChange[] };

export function StatusTimeline({ entries }: StatusTimelineProps) {
  if (entries.length === 0)
    return <p className="text-sm text-muted-foreground">No status changes yet.</p>;

  return (
    <ol aria-label="Status history" className="ml-2 border-l border-border">
      {entries.map((entry, index) => (
        <li key={`${entry.at}-${index}`} className="relative pb-6 pl-5 last:pb-0">
          <span
            aria-hidden="true"
            className={`absolute -left-1.5 top-1 h-3 w-3 rounded-full border ${STATUS_STYLES[entry.to]}`}
          />
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">{REQUEST_STATUS_LABELS[entry.from]} →</span>
            <StatusBadge status={entry.to} className="px-2" />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{entry.actor}</span>
            <time dateTime={entry.at}>{formatTimestamp(entry.at)}</time>
          </div>
          {entry.feedback && (
            <blockquote className="mt-2 whitespace-pre-wrap break-words border-l-2 border-border pl-3 text-sm text-foreground">
              “{entry.feedback}”
            </blockquote>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Fixed to UTC so server and client render the same text (no hydration mismatch). */
function formatTimestamp(iso: string): string {
  const formatted = new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
  return `${formatted} UTC`;
}
