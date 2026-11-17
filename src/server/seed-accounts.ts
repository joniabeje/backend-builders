// Demo accounts seeded for local development and demos (#60). Fixed ids so re-seeding
// overwrites the same documents. Passwords are intentionally simple and documented in
// docs/ARCHITECTURE.md — change them before any shared or production project.
import type { Role } from "@/domain/auth";

export type SeedAccount = {
  id: string;
  email: string;
  name: string;
  role: Role;
  password: string;
};

export const SEED_ACCOUNTS: readonly SeedAccount[] = [
  {
    id: "student",
    email: "student@cea.howard.edu",
    name: "Demo Student",
    role: "student",
    password: "student-demo",
  },
  {
    id: "advisor",
    email: "advisor@cea.howard.edu",
    name: "Demo Advisor",
    role: "advisor",
    password: "advisor-demo",
  },
  {
    id: "admin",
    email: "admin@cea.howard.edu",
    name: "Demo Admin",
    role: "admin",
    password: "admin-demo",
  },
  {
    id: "facilities",
    email: "facilities@cea.howard.edu",
    name: "Demo Facilities",
    role: "facilities",
    password: "facilities-demo",
  },
];
