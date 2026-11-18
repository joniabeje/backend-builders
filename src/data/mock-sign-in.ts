// Demo credential check for VITE_USE_MOCKS (#90). Lets Playwright drive /login
// without the Firestore emulator; production always uses POST /api/auth/sign-in.
import { DEMO_ACCOUNTS } from "@/domain/demo-accounts";
import type { PublicUser } from "@/domain/auth";

/** Returns the matching seeded account, or null when the credentials are wrong. */
export function mockSignIn(email: string, password: string): PublicUser | null {
  const normalized = email.trim().toLowerCase();
  const account = DEMO_ACCOUNTS.find(
    (entry) => entry.email.toLowerCase() === normalized && entry.password === password,
  );
  if (!account) return null;
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
  };
}
