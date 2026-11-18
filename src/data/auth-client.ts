// Browser helpers for the login form (#61). Always sends credentials so the
// HttpOnly cea_session cookie is stored and sent. Under VITE_USE_MOCKS the
// client checks seeded demo accounts locally so Playwright can sign in without
// Firestore (#90).
import type { PublicUser } from "@/domain/auth";
import { mockSignIn } from "./mock-sign-in";

export class AuthClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthClientError";
    this.status = status;
  }
}

export async function signIn(email: string, password: string): Promise<PublicUser> {
  if (import.meta.env.VITE_USE_MOCKS === "true") {
    const user = mockSignIn(email, password);
    if (!user) throw new AuthClientError("Invalid email or password.", 401);
    return user;
  }

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
  if (import.meta.env.VITE_USE_MOCKS === "true") return;
  await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" });
}
