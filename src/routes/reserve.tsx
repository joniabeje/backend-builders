import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ROOMS, recommendRooms } from "@/lib/rooms";
import { CheckCircle2, AlertTriangle, Sparkles, Users2, CalendarCheck2 } from "lucide-react";

export const Route = createFileRoute("/reserve")({
  head: () => ({
    meta: [
      { title: "Reserve a Space — CEA Reserve" },
      { name: "description", content: "Submit an event space reservation with real-time validation and smart room recommendations." },
    ],
  }),
  component: ReservePage,
});

type FormState = {
  title: string;
  organization: string;
  advisor: string;
  date: string;
  startTime: string;
  endTime: string;
  attendance: string;
  purpose: string;
  room: string;
  hasFood: boolean;
  externalGuests: boolean;
  itNeeds: boolean;
};

const initial: FormState = {
  title: "", organization: "", advisor: "", date: "", startTime: "", endTime: "",
  attendance: "", purpose: "", room: "", hasFood: false, externalGuests: false, itNeeds: false,
};

function ReservePage() {
  const [form, setForm] = useState<FormState>(initial);
  const [submitted, setSubmitted] = useState(false);

  const attendance = parseInt(form.attendance) || 0;
  const recs = useMemo(() => recommendRooms(attendance), [attendance]);

  const isAfterHours = useMemo(() => {
    if (!form.startTime || !form.endTime) return false;
    const startH = parseInt(form.startTime.split(":")[0]);
    const endH = parseInt(form.endTime.split(":")[0]);
    return startH >= 18 || startH < 8 || endH >= 20 || endH < 8;
  }, [form.startTime, form.endTime]);

  const issues: { type: "error" | "warn"; msg: string }[] = [];
  if (form.attendance && attendance < 1) issues.push({ type: "error", msg: "Attendance must be at least 1." });
  if (form.room) {
    const r = ROOMS.find((x) => x.id === form.room);
    if (r && attendance > r.capacity) issues.push({ type: "error", msg: `${r.name} capacity is ${r.capacity} — exceeds attendance.` });
  }
  if (form.startTime && form.endTime && form.startTime >= form.endTime) {
    issues.push({ type: "error", msg: "End time must be after start time." });
  }
  if (isAfterHours) issues.push({ type: "warn", msg: "After-hours event — supervisor confirmation required." });
  if (form.externalGuests && attendance >= 50) issues.push({ type: "warn", msg: "External guests + large attendance — security may be required." });
  if (form.hasFood) issues.push({ type: "warn", msg: "Food service — custodial pre/post event scheduling will be triggered." });

  const requiredOk = form.title && form.organization && form.advisor && form.date && form.startTime && form.endTime && form.attendance && form.purpose && form.room;
  const canSubmit = requiredOk && !issues.some((i) => i.type === "error");

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-card">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h1 className="mt-6 text-3xl font-bold text-foreground">Request submitted!</h1>
            <p className="mt-3 text-muted-foreground">
              Your reservation for <strong>{form.title}</strong> has been queued for review.
              You'll receive status updates as it moves through approval.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link to="/dashboard" className="inline-flex rounded-md bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant">
                View My Requests
              </Link>
              <button onClick={() => { setForm(initial); setSubmitted(false); }} className="inline-flex rounded-md border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary">
                New Request
              </button>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary">
            <CalendarCheck2 className="h-3.5 w-3.5" /> New Reservation
          </div>
          <h1 className="mt-4 text-3xl font-bold text-foreground md:text-4xl">Reserve an event space</h1>
          <p className="mt-2 text-muted-foreground">Real-time validation guides you through a complete request.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <form
            onSubmit={(e) => { e.preventDefault(); if (canSubmit) setSubmitted(true); }}
            className="space-y-8 rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card"
          >
            <Section title="Event Information">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Event Title *">
                  <input className={inputCls} value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="NSBE General Body Meeting" />
                </Field>
                <Field label="Organization *">
                  <input className={inputCls} value={form.organization} onChange={(e) => update("organization", e.target.value)} placeholder="NSBE — Howard Chapter" />
                </Field>
                <Field label="Faculty Advisor *">
                  <input className={inputCls} value={form.advisor} onChange={(e) => update("advisor", e.target.value)} placeholder="Dr. Last Name" />
                </Field>
                <Field label="Expected Attendance *">
                  <input type="number" min={1} className={inputCls} value={form.attendance} onChange={(e) => update("attendance", e.target.value)} placeholder="50" />
                </Field>
                <Field label="Event Purpose *" full>
                  <textarea rows={3} className={inputCls} value={form.purpose} onChange={(e) => update("purpose", e.target.value)} placeholder="Brief description of the event..." />
                </Field>
              </div>
            </Section>

            <Section title="Date & Time">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Date *"><input type="date" className={inputCls} value={form.date} onChange={(e) => update("date", e.target.value)} /></Field>
                <Field label="Start *"><input type="time" className={inputCls} value={form.startTime} onChange={(e) => update("startTime", e.target.value)} /></Field>
                <Field label="End *"><input type="time" className={inputCls} value={form.endTime} onChange={(e) => update("endTime", e.target.value)} /></Field>
              </div>
            </Section>

            <Section title="Room Selection">
              {recs.length > 0 && (
                <div className="mb-4 rounded-lg border border-gold/40 bg-gold/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Sparkles className="h-4 w-4 text-gold-foreground" /> Recommended for {attendance} attendees
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {recs.map((r) => (
                      <button key={r.id} type="button" onClick={() => update("room", r.id)}
                        className={`text-left rounded-md border p-3 text-sm transition-smooth ${form.room === r.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}>
                        <div className="font-semibold text-foreground">{r.name}</div>
                        <div className="text-xs text-muted-foreground">Cap. {r.capacity} · {r.building}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Field label="Choose Room *">
                <select className={inputCls} value={form.room} onChange={(e) => update("room", e.target.value)}>
                  <option value="">Select a room…</option>
                  {ROOMS.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} (capacity {r.capacity})</option>
                  ))}
                </select>
              </Field>
            </Section>

            <Section title="Additional Services">
              <div className="grid gap-3 sm:grid-cols-3">
                <Toggle label="Food / catering" checked={form.hasFood} onChange={(v) => update("hasFood", v)} />
                <Toggle label="External guests" checked={form.externalGuests} onChange={(v) => update("externalGuests", v)} />
                <Toggle label="IT / AV equipment" checked={form.itNeeds} onChange={(v) => update("itNeeds", v)} />
              </div>
            </Section>

            <div className="flex items-center justify-between gap-4 border-t border-border pt-6">
              <p className="text-xs text-muted-foreground">Fields marked * are required.</p>
              <button type="submit" disabled={!canSubmit}
                className="inline-flex items-center gap-2 rounded-md bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant transition-smooth disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-95">
                Submit Request
              </button>
            </div>
          </form>

          <aside className="space-y-4 lg:sticky lg:top-24 self-start">
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Users2 className="h-4 w-4 text-primary" /> Live Validation
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {issues.length === 0 && requiredOk && (
                  <li className="flex gap-2 text-success"><CheckCircle2 className="h-4 w-4 mt-0.5" /> All checks passed.</li>
                )}
                {issues.length === 0 && !requiredOk && (
                  <li className="text-muted-foreground">Fill in the form to see live checks.</li>
                )}
                {issues.map((i, idx) => (
                  <li key={idx} className={`flex gap-2 ${i.type === "error" ? "text-destructive" : "text-warning-foreground"}`}>
                    <AlertTriangle className={`h-4 w-4 mt-0.5 ${i.type === "error" ? "text-destructive" : "text-warning"}`} />
                    <span className="text-foreground/90">{i.msg}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-gradient-primary p-5 text-primary-foreground shadow-elegant">
              <div className="text-xs font-medium uppercase tracking-wider text-gold">Tip</div>
              <p className="mt-2 text-sm">Events with food, after-hours timing, or external guests automatically notify custodial, security, and IT teams.</p>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-smooth placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`flex items-center justify-between rounded-md border p-3 text-sm font-medium transition-smooth ${checked ? "border-primary bg-primary/5 text-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40"}`}>
      {label}
      <span className={`ml-3 inline-flex h-5 w-9 items-center rounded-full transition-smooth ${checked ? "bg-gradient-primary" : "bg-muted"}`}>
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-smooth ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}