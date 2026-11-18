// Demo accounts for local/emulator seed and VITE_USE_MOCKS sign-in (#60, #90).
// Fixed ids so re-seeding overwrites the same documents. Passwords are intentionally
// simple and documented in docs/ARCHITECTURE.md — change them before any shared project.
import type { Role } from "./auth";

export type DemoAccount = {
  id: string;
  email: string;
  name: string;
  role: Role;
  password: string;
};

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
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
