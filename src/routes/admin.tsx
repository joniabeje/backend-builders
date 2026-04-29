import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { MOCK_REQUESTS, riskScore, type EventRequest, type RequestStatus } from "@/lib/mock-requests";
import { CheckCircle2, XCircle, AlertTriangle, Filter, Inbox, ShieldCheck, Activity } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — CEA Reserve" },
      { name: "description", content: "Centralized event request review with risk indicators and approval controls." },
    ],
  }),
  component: AdminPage,
});

const statusStyles: Record<RequestStatus, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/40",
  approved: "bg-success/15 text-success border-success/40",
  rejected: "bg-destructive/15 text-destructive border-destructive/40",
  "needs-changes": "bg-primary/10 text-primary border-primary/30",
};
const statusLabel: Record<RequestStatus, string> = {
  pending: "Pending", approved: "Approved", rejected: "Rejected", "needs-changes": "Needs Changes",
};

const riskStyles = {
  low: "bg-success/10 text-success border-success/30",
  medium: "bg-warning/15 text-warning-foreground border-warning/40",
  high: "bg-destructive/15 text-destructive border-destructive/40",
};

function AdminPage() {
  const [requests, setRequests] = useState<EventRequest[]>(MOCK_REQUESTS);
  const [filter, setFilter] = useState<"all" | RequestStatus>("all");

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  function setStatus(id: string, status: RequestStatus) {
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  const stats = [
    { label: "Total Requests", value: requests.length, icon: Inbox, tone: "primary" },
    { label: "Pending Review", value: requests.filter((r) => r.status === "pending").length, icon: Activity, tone: "warning" },
    { label: "High Risk", value: requests.filter((r) => riskScore(r).level === "high").length, icon: AlertTriangle, tone: "destructive" },
    { label: "Approved", value: requests.filter((r) => r.status === "approved").length, icon: ShieldCheck, tone: "success" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Dean's Office
          </div>
          <h1 className="mt-4 text-3xl font-bold text-foreground md:text-4xl">Admin Dashboard</h1>
          <p className="mt-2 text-muted-foreground">Review reservations with auto-flagged risks and coordinate support services.</p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-3xl font-bold text-foreground">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Filter className="h-3.5 w-3.5" /> Filter:</span>
          {(["all", "pending", "approved", "needs-changes", "rejected"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-smooth ${filter === f ? "bg-gradient-primary text-primary-foreground shadow-elegant" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {f === "all" ? "All" : statusLabel[f]}
            </button>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => {
                const risk = riskScore(r);
                return (
                  <tr key={r.id} className="hover:bg-secondary/40 transition-smooth">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-foreground">{r.title}</div>
                      <div className="text-xs text-muted-foreground">{r.organization} · {r.requester}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-foreground">{r.date}</div>
                      <div className="text-xs text-muted-foreground">{r.startTime}–{r.endTime}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-foreground">{r.room}</div>
                      <div className="text-xs text-muted-foreground">{r.attendance} attendees</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${riskStyles[risk.level]}`}>
                        {risk.level !== "low" && <AlertTriangle className="h-3 w-3" />}
                        {risk.level}
                      </span>
                      {risk.reasons.length > 0 && (
                        <div className="mt-1 text-[11px] text-muted-foreground">{risk.reasons.join(" · ")}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[r.status]}`}>
                        {statusLabel[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="inline-flex gap-1.5">
                        <button onClick={() => setStatus(r.id, "approved")} title="Approve"
                          className="inline-flex items-center justify-center rounded-md bg-success/10 p-2 text-success transition-smooth hover:bg-success/20">
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => setStatus(r.id, "rejected")} title="Reject"
                          className="inline-flex items-center justify-center rounded-md bg-destructive/10 p-2 text-destructive transition-smooth hover:bg-destructive/20">
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No requests in this view.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}