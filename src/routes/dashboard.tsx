import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { MOCK_REQUESTS, type RequestStatus } from "@/lib/mock-requests";
import { Calendar, Clock, MapPin, Users2 } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "My Requests — CEA Reserve" },
      { name: "description", content: "Track the status of your event space reservation requests." },
    ],
  }),
  component: DashboardPage,
});

const statusStyles: Record<RequestStatus, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/40",
  approved: "bg-success/15 text-success border-success/40",
  rejected: "bg-destructive/15 text-destructive border-destructive/40",
  "needs-changes": "bg-primary/10 text-primary border-primary/30",
};

const statusLabel: Record<RequestStatus, string> = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  "needs-changes": "Needs Changes",
};

function DashboardPage() {
  const counts = MOCK_REQUESTS.reduce<Record<RequestStatus, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, { pending: 0, approved: 0, rejected: 0, "needs-changes": 0 });

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">My Reservation Requests</h1>
          <p className="mt-2 text-muted-foreground">Track status and manage your CEA event submissions.</p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["pending", "approved", "needs-changes", "rejected"] as RequestStatus[]).map((s) => (
            <div key={s} className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{statusLabel[s]}</div>
              <div className="mt-2 text-3xl font-bold text-foreground">{counts[s]}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4">
          {MOCK_REQUESTS.map((r) => (
            <article key={r.id} className="group rounded-xl border border-border bg-card p-6 shadow-card transition-smooth hover:shadow-elegant">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-foreground">{r.title}</h3>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[r.status]}`}>
                      {statusLabel[r.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{r.organization} · {r.id}</p>
                </div>
                <div className="text-xs text-muted-foreground">Submitted {r.submittedAt}</div>
              </div>
              <div className="mt-5 grid gap-4 text-sm sm:grid-cols-4">
                <Meta icon={Calendar} label="Date" value={r.date} />
                <Meta icon={Clock} label="Time" value={`${r.startTime}–${r.endTime}`} />
                <Meta icon={MapPin} label="Room" value={r.room} />
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

function Meta({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
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