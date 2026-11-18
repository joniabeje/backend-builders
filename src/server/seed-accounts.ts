// Re-export demo accounts for the seed script and AuthApi (#60). Source of truth is
// src/domain/demo-accounts.ts so the Playwright mock sign-in can share them (#90).
export {
  DEMO_ACCOUNTS as SEED_ACCOUNTS,
  type DemoAccount as SeedAccount,
} from "@/domain/demo-accounts";
