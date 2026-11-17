// Roles and public account shapes for sign-in (#60 / #14). Framework-free so the
// server and a future login page share the same vocabulary.

export const ROLES = ["student", "advisor", "admin", "facilities"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  student: "Student",
  advisor: "Advisor",
  admin: "Admin",
  facilities: "Facilities",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** What the API returns about a signed-in user. Never includes password material. */
export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};
