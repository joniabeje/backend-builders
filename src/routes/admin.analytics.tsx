import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { REQUEST_STATUS_LABELS, REQUEST_STATUSES } from "@/domain/reservation";
import { useRoomUsage } from "@/hooks/use-room-usage";
import { getRoomDisplayName } from "@/lib/rooms";
import { Activity, ArrowLeft, BarChart3, ShieldCheck } from "lucide-react";

/** Default window covers the in-memory seed months used by Playwright (#52). */
const DEFAULT_FROM = "2026-04-01";
const DEFAULT_TO = "2026-05-31";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — CEA Reserve" },
      {
        name: "description",
        content: "Room usage and request status totals for the Dean's Office.",
      },
    ],
  }),
  component: AdminAnalyticsPage,
});

const statusChartConfig = {
  count: { label: "Requests", color: "var(--chart-1)" },
} satisfies ChartConfig;

const hoursChartConfig = {
  approvedHours: { label: "Approved hours", color: "var(--chart-1)" },
  bookings: { label: "Bookings", color: "var(--chart-2)" },
} satisfies ChartConfig;

function AdminAnalyticsPage() {
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const { data, isPending, isError, error } = useRoomUsage(from, to);

  const statusData = useMemo(() => {
    if (!data) return [];
    return REQUEST_STATUSES.map((status) => ({
      status: REQUEST_STATUS_LABELS[status],
      count: data.byStatus[status],
    }));
  }, [data]);

  const roomData = useMemo(() => {
    if (!data) return [];
    return data.rooms
      .map((row) => {
        const bookings = row.months.reduce((sum, month) => sum + month.bookings, 0);
        const approvedHours = row.months.reduce((sum, month) => sum + month.approvedHours, 0);
        return {
          room: getRoomDisplayName(row.roomId),
          bookings,
          approvedHours,
        };
      })
      .filter((row) => row.bookings > 0 || row.approvedHours > 0);
  }, [data]);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Dean's Office
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">Analytics</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Room utilization and request status totals for an event-date range.
            </p>
          </div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
          >
            <ArrowLeft className="h-4 w-4" /> Back to requests
          </Link>
        </div>

        <div className="mb-8 flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-foreground">From</span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-foreground">To</span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Filters on event date. Rejected requests stay in the totals.
          </p>
        </div>

        {isPending ? (
          <p className="text-sm text-muted-foreground">Loading usage…</p>
        ) : isError ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error instanceof Error ? error.message : "Could not load analytics."}
          </p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Requests by status</h2>
              </div>
              <ChartContainer config={statusChartConfig} className="aspect-[4/3] w-full">
                <BarChart data={statusData} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="status" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Room usage</h2>
              </div>
              {roomData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bookings in this date range.</p>
              ) : (
                <ChartContainer config={hoursChartConfig} className="aspect-[4/3] w-full">
                  <BarChart data={roomData} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="room"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="approvedHours" fill="var(--color-approvedHours)" radius={4} />
                    <Bar dataKey="bookings" fill="var(--color-bookings)" radius={4} />
                  </BarChart>
                </ChartContainer>
              )}
            </section>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
