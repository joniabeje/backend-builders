import { REQUEST_STATUS_LABELS, type RequestStatus } from "@/domain/reservation";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<RequestStatus, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/40",
  approved: "bg-success/15 text-success border-success/40",
  rejected: "bg-destructive/15 text-destructive border-destructive/40",
  "needs-changes": "bg-primary/10 text-primary border-primary/30",
};

export function StatusBadge({
  status,
  label = REQUEST_STATUS_LABELS[status],
  className,
}: {
  status: RequestStatus;
  /** Overrides the default label, e.g. "Pending Review" on the requester dashboard. */
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      {label}
    </span>
  );
}
