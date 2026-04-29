import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import heroImg from "@/assets/hero.jpg";
import {
  CalendarCheck2, ShieldCheck, Sparkles, Gauge, Building2, Users2, ArrowRight, CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero opacity-95" />
          <img
            src={heroImg}
            alt="Howard CEA atrium"
            width={1600}
            height={1024}
            className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-40"
          />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-white/10 px-3 py-1 text-xs font-medium text-gold backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Howard University · College of Engineering & Architecture
              </div>
              <h1 className="mt-6 text-4xl font-bold leading-tight text-primary-foreground md:text-6xl">
                Smart event space reservations,{" "}
                <span className="bg-gradient-gold bg-clip-text text-transparent">made effortless.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-primary-foreground/80">
                CEA Reserve transforms manual event approvals into an intelligent decision-support
                platform — real-time validation, smart room recommendations, and coordinated
                approvals across IT, custodial, and security.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/reserve"
                  className="inline-flex items-center gap-2 rounded-md bg-gradient-gold px-6 py-3 text-sm font-semibold text-gold-foreground shadow-elegant transition-smooth hover:opacity-95"
                >
                  Reserve a Space <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-primary-foreground backdrop-blur transition-smooth hover:bg-white/10"
                >
                  Open Admin Dashboard
                </Link>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-6 max-w-lg">
                {[
                  { k: "10+", v: "CEA Spaces" },
                  { k: "<1s", v: "Validation" },
                  { k: "24/7", v: "Tracking" },
                ].map((s) => (
                  <div key={s.v}>
                    <div className="text-3xl font-bold text-gold">{s.k}</div>
                    <div className="text-xs uppercase tracking-wider text-primary-foreground/60">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Designed for every stakeholder
            </h2>
            <p className="mt-4 text-muted-foreground">
              From faculty advisors and student organizations to Dean's Office administrators and
              support staff — every workflow is unified in one platform.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: CalendarCheck2, title: "Real-time Validation", body: "Catch missing fields, capacity mismatches, and policy violations before submission." },
              { icon: Building2, title: "Smart Room Matching", body: "Get recommended rooms based on attendance, AV needs, and availability." },
              { icon: ShieldCheck, title: "Risk Indicators", body: "After-hours, external guests, and large attendance are automatically flagged for admin review." },
              { icon: Gauge, title: "Centralized Dashboard", body: "All requests in one view — approve, reject, or send back for changes." },
              { icon: Users2, title: "Service Coordination", body: "Notify IT, custodial, and security automatically when their support is required." },
              { icon: Sparkles, title: "Usage Analytics", body: "Track room usage, peak demand, and resource patterns to plan ahead." },
            ].map((f) => (
              <div key={f.title} className="group rounded-xl border border-border bg-card p-6 shadow-card transition-smooth hover:-translate-y-1 hover:shadow-elegant">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-elegant">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="bg-secondary/40 border-y border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">From request to approval</h2>
            <div className="mt-12 grid gap-8 md:grid-cols-4">
              {[
                "Submit event details with live validation",
                "System checks availability & recommends rooms",
                "Risk factors flagged for admin review",
                "Approval routed with auto service notifications",
              ].map((step, i) => (
                <div key={step} className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground shadow-elegant">
                    {i + 1}
                  </div>
                  <p className="mt-4 text-sm font-medium text-foreground">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="rounded-2xl bg-gradient-primary p-10 md:p-14 shadow-elegant relative overflow-hidden">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
            <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h2 className="text-3xl font-bold text-primary-foreground md:text-4xl">
                  Ready to reserve your space?
                </h2>
                <p className="mt-3 text-primary-foreground/80 max-w-xl">
                  Submit your CEA event reservation in minutes. Get instant feedback and track approval status end-to-end.
                </p>
                <ul className="mt-5 grid gap-2 text-sm text-primary-foreground/90 sm:grid-cols-2 max-w-lg">
                  {["Real-time conflict detection", "Capacity-based suggestions", "Multi-service coordination", "Status notifications"].map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-gold" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                to="/reserve"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-gradient-gold px-6 py-3 text-sm font-semibold text-gold-foreground shadow-elegant transition-smooth hover:opacity-95"
              >
                Start Reservation <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
