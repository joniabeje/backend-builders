import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { StatusBadge } from "@/components/StatusBadge";
import {
  REQUEST_STATUSES,
  REQUEST_STATUS_LABELS,
  type EventRequest,
  type RequestStatus,
} from "@/domain/reservation";
import { useReservations } from "@/hooks/use-reservations";
import { getRoomDisplayName } from "@/lib/rooms";
import { Calendar, Clock, MapPin, Users2 } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "My Requests — CEA Reserve" },
      {
        name: "description",
        content: "Track the status of your event space reservation requests.",
      },
    ],
  }),
  component: DashboardPage,
});

/** Requester-facing wording; the admin view uses the shorter "Pending". */
function requesterLabel(status: RequestStatus): string {
  return status === "pending" ? "Pending Review" : REQUEST_STATUS_LABELS[status];
}

function countByStatus(requests: readonly EventRequest[]): Record<RequestStatus, number> {
  const counts: Record<RequestStatus, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
    "needs-changes": 0,
  };
  for (const request of requests) counts[request.status] += 1;
  return counts;
}

function DashboardPage() {
  const { data: requests = [], isPending, isError, error } = useReservations();
  const counts = countByStatus(requests);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            My Reservation Requests
          </h1>
          <p className="mt-2 text-muted-foreground">
            Track status and manage your CEA event submissions.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REQUEST_STATUSES.map((s) => (
            <div key={s} className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {requesterLabel(s)}
              </div>
              <div className="mt-2 text-3xl font-bold text-foreground">{counts[s]}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4">
          {isPending && <p className="text-sm text-muted-foreground">Loading your requests…</p>}
          {isError && (
            <p role="alert" className="text-sm text-destructive">
              Could not load your requests: {error.message}
            </p>
          )}
          {requests.map((r) => (
            <article
              key={r.id}
              className="group rounded-xl border border-border bg-card p-6 shadow-card transition-smooth hover:shadow-elegant"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-foreground">{r.title}</h3>
                    <StatusBadge status={r.status} label={requesterLabel(r.status)} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {r.organization} · {r.id}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">Submitted {r.submittedAt}</div>
              </div>
              <div className="mt-5 grid gap-4 text-sm sm:grid-cols-4">
                <Meta icon={Calendar} label="Date" value={r.date} />
                <Meta icon={Clock} label="Time" value={`${r.startTime}–${r.endTime}`} />
                <Meta icon={MapPin} label="Room" value={getRoomDisplayName(r.room)} />
                <Meta icon={Users2} label="Attendance" value={String(r.attendance)} />
              </div>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-primary mt-0.5" />
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}
