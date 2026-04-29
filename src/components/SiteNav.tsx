import { Link } from "@tanstack/react-router";
import { CalendarCheck2 } from "lucide-react";

const links = [
  { to: "/", label: "Home" },
  { to: "/reserve", label: "Reserve" },
  { to: "/rooms", label: "Rooms" },
  { to: "/dashboard", label: "My Requests" },
  { to: "/admin", label: "Admin" },
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-elegant transition-smooth group-hover:scale-105">
            <CalendarCheck2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-foreground">CEA Reserve</div>
            <div className="text-[11px] text-muted-foreground">Howard University</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground hover:bg-secondary"
              activeProps={{ className: "rounded-md px-3 py-2 text-sm font-semibold text-primary bg-secondary" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          to="/reserve"
          className="hidden sm:inline-flex items-center justify-center rounded-md bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-elegant transition-smooth hover:opacity-90"
        >
          New Reservation
        </Link>
      </div>
    </header>
  );
}