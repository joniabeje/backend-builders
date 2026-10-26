import { AlertTriangle, CheckCircle2, Users2 } from "lucide-react";
import type { ValidationIssue } from "@/domain/reservation-validation";

export function ValidationPanel({
  issues,
  requiredFieldsFilled,
}: {
  issues: readonly ValidationIssue[];
  requiredFieldsFilled: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Users2 className="h-4 w-4 text-primary" /> Live Validation
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {issues.length === 0 && requiredFieldsFilled && (
          <li className="flex gap-2 text-success">
            <CheckCircle2 className="h-4 w-4 mt-0.5" /> All checks passed.
          </li>
        )}
        {issues.length === 0 && !requiredFieldsFilled && (
          <li className="text-muted-foreground">Fill in the form to see live checks.</li>
        )}
        {issues.map((i) => (
          <li
            key={i.code}
            className={`flex gap-2 ${i.severity === "error" ? "text-destructive" : "text-warning-foreground"}`}
          >
            <AlertTriangle
              className={`h-4 w-4 mt-0.5 ${i.severity === "error" ? "text-destructive" : "text-warning"}`}
            />
            <span className="text-foreground/90">{i.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
