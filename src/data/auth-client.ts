// Browser helpers for the login form (#61). Always sends credentials so the
// HttpOnly cea_session cookie is stored and sent.
import type { PublicUser } from "@/domain/auth";

export class AuthClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthClientError";
    this.status = status;
  }
}

export async function signIn(email: string, password: string): Promise<PublicUser> {
  const response = await fetch("/api/auth/sign-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    user?: PublicUser;
    error?: string;
  };
  if (!response.ok || !body.user) {
    throw new AuthClientError(body.error ?? "Sign in failed.", response.status);
  }
  return body.user;
}

export async function signOut(): Promise<void> {
  await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" });
}
