import type { ReactNode } from "react";

export const inputClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-smooth placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30";

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

export function FormField({
  label,
  children,
  full,
}: {
  label: string;
  children: ReactNode;
  /** Spans both columns of a two-column grid. */
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between rounded-md border p-3 text-sm font-medium transition-smooth ${checked ? "border-primary bg-primary/5 text-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40"}`}
    >
      {label}
      <span
        className={`ml-3 inline-flex h-5 w-9 items-center rounded-full transition-smooth ${checked ? "bg-gradient-primary" : "bg-muted"}`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-smooth ${checked ? "translate-x-4" : "translate-x-0.5"}`}
        />
      </span>
    </button>
  );
}
