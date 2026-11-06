import type { RequestStatus } from "@/domain/reservation";

/** Badge colours per status; shared by StatusBadge, StatusTimeline, and feedback callouts. */
export const STATUS_STYLES: Record<RequestStatus, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/40",
  approved: "bg-success/15 text-success border-success/40",
  rejected: "bg-destructive/15 text-destructive border-destructive/40",
  "needs-changes": "bg-primary/10 text-primary border-primary/30",
};
