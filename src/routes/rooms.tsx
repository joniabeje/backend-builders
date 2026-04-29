import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ROOMS } from "@/lib/rooms";
import { MapPin, Layers, Users2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/rooms")({
  head: () => ({
    meta: [
      { title: "Rooms — CEA Reserve" },
      { name: "description", content: "Browse event spaces across the College of Engineering & Architecture, with capacities, amenities, and availability." },
      { property: "og:title", content: "Rooms — CEA Reserve" },
      { property: "og:description", content: "Browse event spaces across CEA with amenities and availability." },
    ],
  }),
  component: RoomsPage,
});

function RoomsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-gradient-to-b from-secondary/40 to-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <div className="max-w-2xl">
              <div className="inline-flex items-center rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                CEA Spaces
              </div>
              <h1 className="mt-4 font-display text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                Find the right room for your event
              </h1>
              <p className="mt-3 text-base md:text-lg text-muted-foreground">
                Explore classrooms, studios, labs, and event spaces across the College of Engineering & Architecture.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ROOMS.map((room) => (
              <article
                key={room.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-smooth hover:shadow-elegant hover:-translate-y-0.5"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={room.image}
                    alt={room.name}
                    width={800}
                    height={600}
                    loading="lazy"
                    className="h-full w-full object-cover transition-smooth group-hover:scale-[1.03]"
                  />
                  <span
                    className={
                      "absolute top-3 right-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow " +
                      (room.status === "available"
                        ? "bg-success text-success-foreground"
                        : "bg-destructive text-destructive-foreground")
                    }
                  >
                    {room.status === "available" ? "Available" : "Reserved"}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-display text-lg font-semibold text-foreground">{room.name}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {room.building}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      {room.floor}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users2 className="h-3.5 w-3.5" />
                      {room.capacity} people
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {room.features.map((f) => (
                      <span
                        key={f}
                        className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 pt-4 border-t border-border/60">
                    <Link
                      to="/reserve"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:opacity-80"
                    >
                      Reserve this room
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}