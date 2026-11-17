import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthClientError, signIn } from "@/data/auth-client";
import { ROLE_LABELS } from "@/domain/auth";

type LoginSearch = {
  redirect?: string;
  error?: string;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect:
      typeof search.redirect === "string" && search.redirect.startsWith("/")
        ? search.redirect
        : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — CEA Reserve" },
      {
        name: "description",
        content: "Sign in to CEA Reserve with your demonstration account.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect: redirectTo, error: searchError } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@cea.howard.edu");
  const [password, setPassword] = useState("admin-demo");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    searchError === "forbidden"
      ? "That account cannot open the admin dashboard. Sign in with an admin account."
      : null,
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const user = await signIn(email.trim(), password);
      const destination =
        redirectTo && redirectTo !== "/login"
          ? redirectTo
          : user.role === "admin"
            ? "/admin"
            : "/dashboard";
      await navigate({ to: destination });
    } catch (err) {
      const message = err instanceof AuthClientError ? err.message : "Sign in failed. Try again.";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:px-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Use a seeded demo account. Passwords are listed in{" "}
            <code className="rounded bg-secondary px-1 py-0.5 text-xs">docs/ARCHITECTURE.md</code>.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Demo accounts</p>
          <ul className="mt-2 space-y-1">
            <li>admin@cea.howard.edu — {ROLE_LABELS.admin} / admin-demo</li>
            <li>student@cea.howard.edu — {ROLE_LABELS.student} / student-demo</li>
            <li>advisor@cea.howard.edu — {ROLE_LABELS.advisor} / advisor-demo</li>
            <li>facilities@cea.howard.edu — {ROLE_LABELS.facilities} / facilities-demo</li>
          </ul>
          <p className="mt-3">
            Need the emulator?{" "}
            <Link to="/" className="font-medium text-primary hover:underline">
              Back home
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
