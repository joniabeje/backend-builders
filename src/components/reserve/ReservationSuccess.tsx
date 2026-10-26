import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

export function ReservationSuccess({
  eventTitle,
  onNewRequest,
}: {
  eventTitle: string;
  onNewRequest: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-card">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
        <CheckCircle2 className="h-8 w-8 text-success" />
      </div>
      <h1 className="mt-6 text-3xl font-bold text-foreground">Request submitted!</h1>
      <p className="mt-3 text-muted-foreground">
        Your reservation for <strong>{eventTitle}</strong> has been queued for review. You'll
        receive status updates as it moves through approval.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link
          to="/dashboard"
          className="inline-flex rounded-md bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant"
        >
          View My Requests
        </Link>
        <button
          onClick={onNewRequest}
          className="inline-flex rounded-md border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
        >
          New Request
        </button>
      </div>
    </div>
  );
}
