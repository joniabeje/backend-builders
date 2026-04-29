export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/40">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} CEA Reserve · Backend Builders · Howard University
          </p>
          <p className="text-xs text-muted-foreground">
            College of Engineering & Architecture
          </p>
        </div>
      </div>
    </footer>
  );
}